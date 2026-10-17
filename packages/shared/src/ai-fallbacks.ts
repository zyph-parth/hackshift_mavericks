/**
 * Deterministic stand-ins for LLM calls. The API tries the real model first
 * (when ANTHROPIC_API_KEY is set) and falls back to these, so every AI feature
 * works offline and is reproducible in a demo.
 */

export const INTERVIEW_KEYWORDS: Record<string, string[]> = {
  React: ['state', 'props', 'memo', 'key', 'render', 'virtual dom', 'usememo', 'reconcil', 'usecallback', 'virtual', 'profil', 'window'],
  TypeScript: ['union', 'discriminat', 'narrow', 'guard', 'in operator', 'typeof', 'never', 'switch', 'generic'],
  'System Design': ['queue', 'fan', 'preference', 'template', 'retry', 'idempot', 'worker', 'channel', 'schema', 'database', 'cache', 'scale'],
  Communication: ['learn', 'mistake', 'feedback', 'changed', 'ownership', 'user', 'team', 'wrong', 'fixed'],
};

const FEEDBACK = [
  'Strong structure. Add a concrete example from your own work to cement it.',
  'Good grasp of the idea. Mention an edge case to show depth.',
  'Solid answer with practical trade-offs.',
  'Clear thinking. Quantify the impact if you can.',
];

export interface GradedAnswer {
  score: number;
  feedback: string;
}

export function gradeAnswer(skill: string, answer: string, salt = 0): GradedAnswer {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const kws = INTERVIEW_KEYWORDS[skill] ?? [];
  const hits = kws.filter((k) => answer.toLowerCase().includes(k)).length;
  if (!words) return { score: 0, feedback: 'No answer was given for this question.' };
  const base = words < 6 ? 22 : 48 + Math.min(words, 50) * 0.18;
  const score = Math.max(15, Math.min(94, Math.round(base + Math.min(hits, 5) * 4 + ((salt * 7 + words) % 6))));
  return {
    score,
    feedback: words < 6 ? 'That was brief. Aim for 3-4 sentences with a concrete example.' : FEEDBACK[(salt + hits) % FEEDBACK.length],
  };
}

export interface IdeaAnalysis {
  problem: string;
  user: string;
  market: string;
  competitors: [string, string][];
  risks: string[];
  canvas: [string, string][];
}

export function analyseIdea(text: string): IdeaAnalysis {
  const t = text.toLowerCase();
  const sme = t.includes('sme') || t.includes('invoice');
  const edu = t.includes('student') || t.includes('learn');
  const agri = t.includes('farm') || t.includes('crop');
  const health = t.includes('health') || t.includes('patient') || t.includes('clinic');
  const domain = sme ? 'SME finance' : edu ? 'education' : agri ? 'agritech' : health ? 'healthcare' : 'your market';
  const cap = domain[0].toUpperCase() + domain.slice(1);
  return {
    problem: `${cap} teams lose time and money to a manual, error-prone process. The pain is frequent, measurable and currently patched together with spreadsheets, calls and WhatsApp groups.`,
    user: sme
      ? 'Owner-operators and finance leads at SMEs with 10 to 200 employees, billing 50+ invoices a month.'
      : edu
        ? 'Students and early-career learners who pay for outcomes, not courses, and drop off when content is not personalised.'
        : agri
          ? 'Small and marginal farmers with a smartphone, low data budgets and decisions that depend on weather and mandi prices.'
          : health
            ? 'Independent clinics and their patients, where follow-ups and records still live on paper.'
            : 'Early adopters who feel the pain weekly and already pay for a partial workaround.',
    market: sme
      ? '~6.3 Cr SMEs in India. Even 1% paying ₹6,000/yr is a ₹380 Cr serviceable market.'
      : 'A large, underserved segment. Size it bottom-up: reachable users × willingness to pay × purchase frequency, then sanity-check against top-down reports.',
    competitors: sme
      ? [['Zoho Invoice', 'Broad suite, weak collections focus'], ['Vyapar', 'Strong SMB base, little automation'], ['Spreadsheets', 'The real incumbent']]
      : [['Incumbent suite', 'Heavy, expensive, generic'], ['Point solution', 'Narrow feature set, no network effects'], ['Do nothing', 'The real incumbent']],
    risks: [
      'Distribution cost may exceed early revenue',
      'Dependence on third-party data or integrations',
      'Customers may not trust automation with something this important at first',
    ],
    canvas: [
      ['Problem', 'The manual workflow that wastes hours every week'],
      ['Solution', 'Automate the workflow end to end with AI assistance'],
      ['Unique value', 'Same outcome in a fraction of the time'],
      ['Unfair advantage', 'Founder domain experience and early pilots'],
      ['Customer segments', 'The specific buyer who feels the pain weekly'],
      ['Key metrics', 'Weekly active accounts, time saved, retention'],
      ['Channels', 'Partners, communities, founder-led sales'],
      ['Costs', 'Cloud, integrations, sales and support'],
      ['Revenue', 'SaaS subscription plus usage-based fees'],
    ],
  };
}

export function draftJobDescription(title: string, notes: string): string {
  const bullets = notes
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [
    `About the role: We are hiring a ${title} to own a meaningful part of our product end to end. You will ship weekly, talk to users directly and set the quality bar for what customers see.`,
    bullets.length ? `What you will do: ${bullets.map((b) => `work hands-on with ${b}`).join('; ')}.` : '',
    'How we hire: complete a short paid proof task, no resume screen, blind AI-assisted review, and a decision within 48 hours.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function draftPitchNote(args: { name: string; startup: string; jobTitle: string; topSkill?: string; level?: number; evidence?: string }) {
  const { name, startup, jobTitle, topSkill, level, evidence } = args;
  const proof = topSkill ? ` My ${topSkill} is ${evidence ?? 'self-reported'} at ${level ?? 70}/100.` : '';
  return `Hi ${startup} team, I'm ${name.split(' ')[0]}.${proof} I'd love to help you ship ${jobTitle.toLowerCase()} work in the first 30 days, and I'm happy to start with a paid proof task if that's easier.`;
}

export function roadmapFor(missing: string[]) {
  const skills = (missing.length ? missing : ['System Design']).slice(0, 3);
  const list = skills.length > 1 ? `${skills.slice(0, -1).join(', ')} and ${skills[skills.length - 1]}` : skills[0];
  return [
    { week: 'Week 1 · Days 1-3', title: `Foundations of ${list}`, detail: `Spend about ${Math.max(2, 6 / skills.length) | 0} hours per skill on an official primer. Take notes on the three ideas interviewers ask about most.` },
    { week: 'Week 1 · Days 4-7', title: `Build a small project with ${list}`, detail: 'Pick one feature this role would actually ship and build a scrappy version of it end to end.' },
    { week: 'Week 2 · Days 8-10', title: 'Ship it in public', detail: 'Deploy it, write a README on the trade-offs, and push it to GitHub so it can be imported as GitHub-verified evidence.' },
    { week: 'Week 2 · Days 11-14', title: `Prove ${list}`, detail: 'Add the skill to your profile, then take the AI interview or a funded proof task to turn it into verified evidence.' },
  ];
}

export interface DeckReview {
  overall: number;
  summary: string;
  slides: { section: string; score: number; note: string }[];
}

const DECK_SECTIONS: { section: string; keys: string[]; missing: string; weak: string; strong: string }[] = [
  { section: 'Problem', keys: ['problem', 'pain', 'struggle', 'waste', 'today', 'hard'], missing: 'No clear problem slide. Open with who hurts and how much.', weak: 'The problem is there but abstract. Add one customer quote or a number.', strong: 'Crisp, specific problem with evidence.' },
  { section: 'Solution', keys: ['solution', 'we build', 'product', 'platform', 'app', 'how it works'], missing: 'No solution slide found. Show the product, not the architecture.', weak: 'Describe the core workflow in one sentence and show a screenshot.', strong: 'Clear solution tied back to the problem.' },
  { section: 'Market', keys: ['market', 'tam', 'sam', 'som', 'crore', 'billion', 'million'], missing: 'No market size. Add a bottom-up TAM/SAM/SOM.', weak: 'Market size looks top-down. Build it bottom-up from customers x price.', strong: 'Market sizing is grounded and bottom-up.' },
  { section: 'Business model', keys: ['pricing', 'revenue', 'subscription', 'per month', 'commission', 'fee', 'business model'], missing: 'How do you make money? Add pricing and unit economics.', weak: 'Pricing is mentioned. Add margins or CAC/LTV.', strong: 'Business model and pricing are clear.' },
  { section: 'Traction', keys: ['traction', 'users', 'customers', 'pilot', 'revenue', 'growth', 'mrr', 'arr', 'waitlist'], missing: 'No traction slide. Even pilots or a waitlist count.', weak: 'Lead with your strongest metric and its trend.', strong: 'Traction is specific and quantified.' },
  { section: 'Competition', keys: ['competitor', 'competition', 'alternative', 'vs', 'unlike'], missing: 'No competition slide. Investors assume you have not looked.', weak: 'Explain why you win, not just who else exists.', strong: 'Honest competitive positioning.' },
  { section: 'Team', keys: ['team', 'founder', 'co-founder', 'cto', 'ceo', 'ex-', 'years'], missing: 'No team slide. Say why you are the people to build this.', weak: 'Add the one credential that makes each founder credible.', strong: 'Team slide earns trust.' },
  { section: 'Ask', keys: ['ask', 'raising', 'raise', 'funding', 'runway', 'use of funds', 'lakh', 'seed'], missing: 'No ask. State the amount, runway and milestones.', weak: 'You mention funding. Add exact amount and what it unlocks.', strong: 'Clear ask with milestones.' },
];

/** Deterministic, section-by-section pitch deck review from extracted deck text. */
export function reviewDeck(text: string): DeckReview {
  const t = text.toLowerCase();
  const numbers = (text.match(/(₹|rs\.?|\$|inr)?\s?\d[\d,.]*\s?(%|cr|crore|lakh|k|m|mn|bn|x|users|customers)?/gi) ?? []).length;
  const slides = DECK_SECTIONS.map((d) => {
    const hits = d.keys.filter((k) => t.includes(k)).length;
    if (!hits) return { section: d.section, score: 25, note: d.missing };
    const score = Math.min(92, 52 + hits * 8 + Math.min(numbers, 10) * 2);
    return { section: d.section, score, note: score >= 75 ? d.strong : d.weak };
  });
  const overall = Math.round(slides.reduce((a, s) => a + s.score, 0) / slides.length);
  const weakest = [...slides].sort((a, b) => a.score - b.score).slice(0, 2).map((s) => s.section.toLowerCase());
  const summary = overall >= 70
    ? `A solid deck. Tighten the ${weakest.join(' and ')} slides before investor meetings.`
    : overall >= 50
      ? `The story is there but thin on proof. Focus next on ${weakest.join(' and ')}.`
      : `This reads like an early draft. Start with ${weakest.join(' and ')}, then add numbers everywhere.`;
  return { overall, summary, slides };
}
