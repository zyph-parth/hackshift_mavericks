import { z } from 'zod';
import { get, insert } from './db';
import { sha } from './lib';

const KEY = process.env.ANTHROPIC_API_KEY;
export const AI_LIVE = !!KEY && process.env.AI_FALLBACK_ONLY !== 'true';

interface CacheRow {
  value: unknown;
}

/**
 * generate<T>: cache -> Claude (structured JSON, schema-validated, one repair retry) -> typed fallback.
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
  const hash = sha(`${opts.promptId}:${opts.version ?? 1}:${JSON.stringify(opts.input)}`);
  const hit = get<CacheRow>('ai_cache', hash);
  if (hit) {
    const parsed = opts.schema.safeParse(hit.data.value);
    if (parsed.success) return { data: parsed.data, source: 'cache' };
  }
  if (AI_LIVE) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': KEY!, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: opts.model ?? 'claude-sonnet-5-5',
            max_tokens: 1500,
            system: `${opts.system}\nRespond with a single JSON object only. No prose, no code fences.`,
            messages: [{ role: 'user', content: JSON.stringify(opts.input) }],
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) break;
        const body = (await res.json()) as { content?: { text?: string }[] };
        const text = body.content?.[0]?.text ?? '';
        const parsed = opts.schema.safeParse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)));
        if (parsed.success) {
          insert('ai_cache', { value: parsed.data }, { id: hash });
          return { data: parsed.data, source: 'model' };
        }
      } catch {
        /* retry once, then fall back */
      }
    }
  }
  const data = opts.fallback();
  try {
    insert('ai_cache', { value: data }, { id: hash });
  } catch {
    /* cache race is harmless */
  }
  return { data, source: 'fallback' };
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
