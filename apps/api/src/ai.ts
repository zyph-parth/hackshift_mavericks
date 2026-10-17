import { z } from 'zod';
import { get, insert } from './db';
import { sha } from './lib';

const KEY = process.env.GROQ_API_KEY;
export const AI_LIVE = !!KEY && process.env.AI_FALLBACK_ONLY !== 'true';

/** Groq models: the large one for grading and analysis, the small one for quick drafts. */
export const MODELS = { smart: 'openai/gpt-oss-120b', fast: 'openai/gpt-oss-20b' } as const;

interface CacheRow {
  value: unknown;
}

/**
 * generate<T>: cache -> Groq (JSON mode, schema-validated, one repair retry) -> typed fallback.
 * Mirrors the AIService contract in PLAN.md section 5.
 */
export async function generate<T>(opts: {
  promptId: string;
  version?: number;
  system: string;
  input: unknown;
  schema: z.ZodType<T>;
  fallback: () => T;
  model?: string;
}): Promise<{ data: T; source: 'cache' | 'model' | 'fallback' }> {
  const model = opts.model ?? MODELS.smart;
  const hash = sha(`${opts.promptId}:${opts.version ?? 1}:${model}:${JSON.stringify(opts.input)}`);
  const hit = get<CacheRow>('ai_cache', hash);
  if (hit) {
    const parsed = opts.schema.safeParse(hit.data.value);
    if (parsed.success) return { data: parsed.data, source: 'cache' };
  }
  if (AI_LIVE) {
    const messages = [
      { role: 'system', content: `${opts.system}\nRespond with a single JSON object only. No prose, no code fences.` },
      { role: 'user', content: JSON.stringify(opts.input) },
    ];
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = Date.now();
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
          body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 2000, response_format: { type: 'json_object' } }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          console.warn(`[ai] ${opts.promptId} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
          if (res.status === 401 || res.status === 403) break;
          continue;
        }
        const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number } };
        const text = body.choices?.[0]?.message?.content ?? '';
        const parsed = opts.schema.safeParse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)));
        console.log(`[ai] ${opts.promptId} ${model} ${Date.now() - started}ms ${body.usage?.total_tokens ?? '?'} tok ${parsed.success ? 'ok' : 'schema-miss'}`);
        if (parsed.success) {
          try { insert('ai_cache', { value: parsed.data }, { id: hash }); } catch { /* cache race is harmless */ }
          return { data: parsed.data, source: 'model' };
        }
        // repair retry: show the model its own output and what was wrong with it
        messages.push({ role: 'assistant', content: text }, { role: 'user', content: `That JSON did not match the required shape: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}. Return corrected JSON only.` });
      } catch (e) {
        console.warn(`[ai] ${opts.promptId} failed: ${(e as Error).message}`);
      }
    }
  }
  // fallbacks are not cached, so a live answer replaces them once the model is reachable
  return { data: opts.fallback(), source: 'fallback' };
}

export const IdeaSchema = z.object({
  problem: z.string(),
  user: z.string(),
  market: z.string(),
  competitors: z.array(z.tuple([z.string(), z.string()])),
  risks: z.array(z.string()),
  canvas: z.array(z.tuple([z.string(), z.string()])),
});
export const TextSchema = z.object({ text: z.string() });
export const GradeSchema = z.object({ score: z.number().min(0).max(100), feedback: z.string() });
export const DeckSchema = z.object({
  overall: z.number().min(0).max(100),
  summary: z.string(),
  slides: z.array(z.object({ section: z.string(), score: z.number().min(0).max(100), note: z.string() })).min(1),
});

export const RubricGradeSchema = z.object({
  results: z.array(z.object({
    criterion: z.string(),
    verdict: z.enum(['met', 'partial', 'cannot_assess']),
    quote: z.string().default(''),
    reason: z.string().default(''),
  })),
});

/**
 * Like `generate`, but with no canned fallback: returns null when the model is off or fails,
 * so callers report "not assessed" instead of presenting an invented answer.
 */
export async function generateStrict<T>(opts: { promptId: string; system: string; input: unknown; schema: z.ZodType<T>; model?: string }): Promise<T | null> {
  if (!AI_LIVE) return null;
  const model = opts.model ?? MODELS.smart;
  const hash = sha(`${opts.promptId}:strict:${model}:${JSON.stringify(opts.input)}`);
  const hit = get<CacheRow>('ai_cache', hash);
  if (hit) {
    const parsed = opts.schema.safeParse(hit.data.value);
    if (parsed.success) return parsed.data;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${opts.system}\nRespond with a single JSON object only. No prose, no code fences.` },
          { role: 'user', content: JSON.stringify(opts.input) },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn(`[ai] ${opts.promptId} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? '';
    const parsed = opts.schema.safeParse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)));
    if (!parsed.success) {
      console.warn(`[ai] ${opts.promptId}: response did not match the schema`);
      return null;
    }
    try { insert('ai_cache', { value: parsed.data }, { id: hash }); } catch { /* cache race is harmless */ }
    return parsed.data;
  } catch (e) {
    console.warn(`[ai] ${opts.promptId} failed: ${(e as Error).message}`);
    return null;
  }
}
