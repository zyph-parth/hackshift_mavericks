import type { FounderProfile, Job, Mentor, ProofTask, Scheme, Submission, Talent } from './types';
import { verifiedScore } from './engines';

const sk = (name: string, evidence: 'self' | 'github' | 'interview' | 'task', level: number, source?: string) => ({
  name,
  evidence,
  level,
  source,
});

/** The hero talent. The demo is built around Priya. */
export const PRIYA: Talent = (() => {
  const skills = [
    sk('React', 'github', 84, 'GitHub: 14 repos, 3 with 50+ stars'),
    sk('TypeScript', 'github', 78, 'GitHub: strict-mode TS across 9 repos'),
    sk('Node.js', 'self', 70),
    sk('Tailwind', 'self', 82),
    sk('PostgreSQL', 'self', 60),
    sk('System Design', 'self', 52),
    sk('Figma', 'self', 66),
  ];
  return {
    id: 't_priya',
    username: 'priya',
    name: 'Priya Sharma',
    headline: 'Frontend engineer · design-minded · IIIT Delhi \'26',
    college: 'IIIT Delhi',
    location: 'New Delhi',
    hue: 18,
    skills,
    verifiedScore: verifiedScore(skills),
    interviewsDone: 0,
    tasksDone: 0,
    earned: 0,
    bio: 'I build fast, delightful interfaces and care about the details nobody notices until they are missing.',
    openTo: ['remote', 'internship', 'full-time'],
  };
})();

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Kabir', 'Ishita', 'Vihaan', 'Meera', 'Sahil', 'Tara', 'Neel', 'Riya', 'Dev', 'Kavya', 'Yash', 'Sneha', 'Aditya', 'Pooja', 'Karan', 'Nisha'];
const LAST = ['Verma', 'Iyer', 'Nair', 'Gupta', 'Reddy', 'Kapoor', 'Mehta', 'Joshi', 'Bose', 'Malhotra', 'Rao', 'Sinha'];
const COLLEGES = ['IIIT Delhi', 'IIT Delhi', 'DTU', 'NSUT', 'BITS Pilani', 'IIIT Hyderabad', 'VIT', 'Manipal'];
const POOL = ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'Figma', 'Go', 'Next.js', 'Machine Learning', 'Docker', 'AWS', 'Flutter', 'SQL', 'Tailwind', 'System Design'];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const TALENTS: Talent[] = (() => {
  const r = rng(42);
  const gen: Talent[] = Array.from({ length: 24 }, (_, i) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    const picked = [...POOL].sort(() => r() - 0.5).slice(0, 4 + Math.floor(r() * 2));
    const evs = ['self', 'github', 'interview', 'task'] as const;
    const skills = picked.map((n) => sk(n, evs[Math.floor(r() * 4)], 55 + Math.floor(r() * 40)));
    return {
      id: `t_${i}`,
      username: name.toLowerCase().replace(' ', '.'),
      name,
      headline: `${picked[0]} developer`,
      college: COLLEGES[Math.floor(r() * COLLEGES.length)],
      location: ['Bengaluru', 'New Delhi', 'Pune', 'Hyderabad', 'Remote'][Math.floor(r() * 5)],
      hue: Math.floor(r() * 360),
      skills,
      verifiedScore: verifiedScore(skills),
      interviewsDone: Math.floor(r() * 3),
      tasksDone: Math.floor(r() * 4),
      earned: Math.floor(r() * 12) * 500,
      bio: '',
      openTo: ['remote', 'internship'],
    };
  });
  return [PRIYA, ...gen];
})();

export const JOBS: Job[] = [
  {
    id: 'j_nimbus',
    title: 'Founding Frontend Engineer',
    startup: 'Nimbus Health',
    startupHue: 160,
    stage: 'Seed',
    type: 'Full-time',
    remote: true,
    location: 'Remote (India)',
    stipend: '₹14–22 LPA',
    equity: '0.5–1.0%',
    required: [
      { name: 'React', weight: 3 },
      { name: 'TypeScript', weight: 3 },
      { name: 'Tailwind', weight: 1 },
      { name: 'System Design', weight: 2 },
    ],
    summary: 'Own the patient-facing web app end to end. Small team, huge surface area, real clinical impact.',
    posted: '2d ago',
    applicants: 41,
    semantic: 0.86,
  },
  {
    id: 'j_ledgerly',
    title: 'Full-stack Engineer, Payments',
    startup: 'Ledgerly',
    startupHue: 262,
    stage: 'Series A',
    type: 'Full-time',
    remote: false,
    location: 'Bengaluru',
    stipend: '₹18–30 LPA',
    equity: '0.2–0.4%',
    required: [
      { name: 'Node.js', weight: 3 },
      { name: 'PostgreSQL', weight: 3 },
      { name: 'TypeScript', weight: 2 },
      { name: 'AWS', weight: 2 },
    ],
    summary: 'Build the ledger that SMEs trust with every rupee. Correctness first, speed second, both mandatory.',
    posted: '4d ago',
    applicants: 88,
    semantic: 0.71,
  },
  {
    id: 'j_krishi',
    title: 'Product Design Intern',
    startup: 'KrishiLink',
    startupHue: 95,
    stage: 'Pre-seed',
    type: 'Internship',
    remote: true,
    location: 'Remote',
    stipend: '₹25k / month',
    equity: null,
    required: [
      { name: 'Figma', weight: 3 },
      { name: 'React', weight: 1 },
      { name: 'Tailwind', weight: 1 },
    ],
    summary: 'Design the app farmers actually open every morning. Field visits included.',
    posted: '1d ago',
    applicants: 23,
    semantic: 0.74,
  },
  {
    id: 'j_orbit',
    title: 'ML Engineer, Recommendations',
    startup: 'Orbit Learn',
    startupHue: 210,
    stage: 'Seed',
    type: 'Full-time',
    remote: true,
    location: 'Remote (India)',
    stipend: '₹20–32 LPA',
    equity: '0.3–0.6%',
    required: [
      { name: 'Python', weight: 3 },
      { name: 'Machine Learning', weight: 3 },
      { name: 'SQL', weight: 1 },
    ],
    summary: 'Personalise learning paths for 2M students. Ship models, not notebooks.',
    posted: '6d ago',
    applicants: 64,
    semantic: 0.55,
  },
  {
    id: 'j_pulse',
    title: 'React Native / Flutter Developer',
    startup: 'Pulse Mobility',
    startupHue: 28,
    stage: 'Pre-seed',
    type: 'Contract',
    remote: true,
    location: 'Remote',
    stipend: '₹60k / month',
    equity: '0.1%',
    required: [
      { name: 'Flutter', weight: 3 },
      { name: 'TypeScript', weight: 1 },
      { name: 'System Design', weight: 1 },
    ],
    summary: 'Ship the rider app for 6 cities in 8 weeks. Contract with conversion path.',
    posted: '3d ago',
    applicants: 19,
    semantic: 0.5,
  },
  {
    id: 'j_vault',
    title: 'Frontend Engineer, Design Systems',
    startup: 'Vaultline',
    startupHue: 340,
    stage: 'Series A',
    type: 'Full-time',
    remote: true,
    location: 'Remote (India)',
    stipend: '₹16–26 LPA',
    equity: '0.15–0.3%',
    required: [
      { name: 'React', weight: 3 },
      { name: 'TypeScript', weight: 2 },
      { name: 'Figma', weight: 2 },
      { name: 'Tailwind', weight: 2 },
    ],
    summary: 'Own the component library used by 40 engineers. Accessibility and motion are your craft.',
    posted: '5d ago',
    applicants: 57,
    semantic: 0.82,
  },
];

const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

export const TASKS: ProofTask[] = [
  {
    id: 'task_dash',
    title: 'Build a responsive pricing page',
    startup: 'Nimbus Health',
    startupHue: 160,
    reward: 2500,
    deadline: inDays(3),
    skills: ['React', 'Tailwind', 'TypeScript'],
    brief:
      'Recreate our 3-tier pricing page from the Figma frame. Must be fully responsive down to 360px, keyboard accessible, with an annual/monthly toggle that animates the price change.',
    rubric: ['Pixel fidelity to Figma', 'Responsive down to 360px', 'Accessible toggle (keyboard + aria)', 'Smooth price animation', 'Clean component structure'],
    funded: true,
    submissions: 48,
    difficulty: 'Medium',
  },
  {
    id: 'task_api',
    title: 'Design an idempotent payments endpoint',
    startup: 'Ledgerly',
    startupHue: 262,
    reward: 4000,
    deadline: inDays(5),
    skills: ['Node.js', 'PostgreSQL'],
    brief: 'Build POST /payments that is safe to retry. Include a short write-up of your failure modes.',
    rubric: ['Idempotency keys', 'Transactional integrity', 'Tests for retry', 'Clear write-up'],
    funded: true,
    submissions: 17,
    difficulty: 'Hard',
  },
  {
    id: 'task_onboard',
    title: 'Redesign our farmer onboarding flow',
    startup: 'KrishiLink',
    startupHue: 95,
    reward: 1500,
    deadline: inDays(2),
    skills: ['Figma'],
    brief: 'Three screens, low-literacy users, Hindi-first. Deliver a clickable Figma prototype.',
    rubric: ['Clarity for low-literacy users', 'Visual hierarchy', 'Prototype flow', 'Rationale'],
    funded: true,
    submissions: 22,
    difficulty: 'Easy',
  },
  {
    id: 'task_rec',
    title: 'Cold-start recommendation baseline',
    startup: 'Orbit Learn',
    startupHue: 210,
    reward: 3000,
    deadline: inDays(6),
    skills: ['Python', 'Machine Learning'],
    brief: 'Given 10k anonymised interactions, produce a baseline recommender and evaluate it honestly.',
    rubric: ['Sound evaluation split', 'Baseline vs improvement', 'Reproducibility', 'Honest limits'],
    funded: false,
    submissions: 9,
    difficulty: 'Hard',
  },
];

export const SUBMISSIONS: Submission[] = [
  { id: 's1', taskId: 'task_dash', talentId: 't_priya', aiScore: 91, recommendation: 'shortlist', meets: ['Pixel fidelity', 'Responsive 360px', 'Keyboard toggle', 'Animated price'], missing: [], summary: 'Excellent fidelity and motion. Toggle is fully accessible with roving focus. Component structure is clean and typed.', link: 'github.com/priya/pricing' },
  { id: 's2', taskId: 'task_dash', talentId: 't_3', aiScore: 84, recommendation: 'shortlist', meets: ['Pixel fidelity', 'Responsive 360px', 'Animated price'], missing: ['Keyboard toggle'], summary: 'Strong visuals, but the toggle is a div with onClick and not reachable by keyboard.', link: 'github.com/ananya/pricing' },
  { id: 's3', taskId: 'task_dash', talentId: 't_7', aiScore: 77, recommendation: 'maybe', meets: ['Responsive 360px', 'Keyboard toggle'], missing: ['Animated price'], summary: 'Solid and accessible, but the price snaps with no animation and spacing drifts from Figma.', link: 'github.com/meera/pricing' },
  { id: 's4', taskId: 'task_dash', talentId: 't_11', aiScore: 69, recommendation: 'maybe', meets: ['Pixel fidelity'], missing: ['Responsive 360px', 'Keyboard toggle'], summary: 'Pretty on desktop, breaks below 520px. No accessibility work.', link: 'github.com/riya/pricing' },
  { id: 's5', taskId: 'task_dash', talentId: 't_14', aiScore: 58, recommendation: 'reject', meets: ['Animated price'], missing: ['Pixel fidelity', 'Responsive 360px', 'Keyboard toggle'], summary: 'Animation is nice but the layout diverges heavily from the Figma frame.', link: 'github.com/yash/pricing' },
  { id: 's6', taskId: 'task_dash', talentId: 't_18', aiScore: 44, recommendation: 'reject', meets: [], missing: ['Pixel fidelity', 'Responsive 360px', 'Keyboard toggle', 'Animated price'], summary: 'Unstyled markup with a partially working toggle.', link: 'github.com/karan/pricing' },
];

export const MENTORS: Mentor[] = [
  { id: 'm_ravi', name: 'Ravi Menon', title: 'Partner', company: 'Seedfolio Capital', hue: 28, expertise: ['Fundraising', 'Pitch', 'Pre-seed'], stages: ['Idea', 'Pre-seed'], price: 499, rating: 4.9, sessions: 212, bio: 'Backed 40+ founders at the first cheque. Will tell you honestly if your deck makes sense.', slots: ['Mon 5:00 PM', 'Tue 11:00 AM', 'Thu 6:30 PM', 'Sat 10:00 AM'] },
  { id: 'm_sana', name: 'Sana Qureshi', title: 'VP Engineering', company: 'Razor Labs', hue: 200, expertise: ['Engineering', 'Hiring', 'Architecture'], stages: ['Pre-seed', 'Seed'], price: 0, rating: 4.8, sessions: 156, bio: 'Scaled a team from 4 to 60. Free sessions for first-time technical founders.', slots: ['Mon 7:00 PM', 'Wed 8:00 PM', 'Fri 5:30 PM'] },
  { id: 'm_dev', name: 'Devansh Rao', title: 'Founder (exit)', company: 'FinPilot', hue: 140, expertise: ['Go-to-market', 'Sales', 'SaaS'], stages: ['Seed', 'Series A'], price: 499, rating: 4.7, sessions: 98, bio: 'Took a B2B SaaS from 0 to ₹12 Cr ARR. Obsessed with the first 10 customers.', slots: ['Tue 4:00 PM', 'Thu 11:30 AM', 'Sun 6:00 PM'] },
  { id: 'm_leela', name: 'Leela Krishnan', title: 'Design Director', company: 'Atlas', hue: 320, expertise: ['Product design', 'UX', 'Brand'], stages: ['Idea', 'Pre-seed', 'Seed'], price: 499, rating: 4.9, sessions: 187, bio: 'Makes first versions feel like fifth versions. Portfolio reviews and product critiques.', slots: ['Wed 3:00 PM', 'Fri 11:00 AM', 'Sat 4:00 PM'] },
  { id: 'm_arun', name: 'Arun Bhatt', title: 'Startup Policy Advisor', company: 'StartupIndia Cell', hue: 55, expertise: ['Grants', 'DPIIT', 'Compliance'], stages: ['Idea', 'Pre-seed'], price: 0, rating: 4.6, sessions: 301, bio: 'Walk through every government scheme you qualify for, with the actual paperwork.', slots: ['Mon 11:00 AM', 'Tue 6:00 PM', 'Fri 3:00 PM'] },
  { id: 'm_nisha', name: 'Nisha Pillai', title: 'Growth Lead', company: 'Cred Studio', hue: 250, expertise: ['Growth', 'Retention', 'Analytics'], stages: ['Seed', 'Series A'], price: 499, rating: 4.8, sessions: 74, bio: 'Retention curves, funnels and the uncomfortable truths hiding in them.', slots: ['Thu 5:00 PM', 'Sat 11:30 AM'] },
];

export const ME_FOUNDER: FounderProfile = {
  id: 'f_arjun',
  name: 'Arjun Mehta',
  hue: 20,
  headline: 'Ex-ops at a logistics unicorn. Building AI for SME invoicing.',
  has: ['Sales', 'Operations', 'Domain expertise'],
  needs: ['Backend', 'Machine Learning', 'Product design'],
  commitment: 'Full-time',
  stage: 'Pre-seed',
  location: 'New Delhi',
  values: ['Ship fast', 'Customer-obsessed', 'Transparent', 'Bootstrapped'],
};

export const COFOUNDERS: FounderProfile[] = [
  { id: 'f_kiran', name: 'Kiran Desai', hue: 210, headline: 'ML engineer, 5 yrs at a fintech. Wants to build, not manage.', has: ['Backend', 'Machine Learning'], needs: ['Sales', 'Operations'], commitment: 'Full-time', stage: 'Pre-seed', location: 'Bengaluru', values: ['Ship fast', 'Transparent', 'Customer-obsessed'] },
  { id: 'f_zoya', name: 'Zoya Ahmed', hue: 330, headline: 'Product designer turned founder. Design-led B2B.', has: ['Product design', 'Frontend'], needs: ['Backend', 'Sales'], commitment: 'Full-time', stage: 'Pre-seed', location: 'New Delhi', values: ['Customer-obsessed', 'Transparent', 'Craft'] },
  { id: 'f_manav', name: 'Manav Singh', hue: 120, headline: 'Full-stack, ex-startup CTO. Side project that outgrew its weekends.', has: ['Backend', 'Frontend', 'DevOps'], needs: ['Sales', 'Product design'], commitment: 'Part-time', stage: 'Idea', location: 'Pune', values: ['Ship fast', 'Bootstrapped'] },
  { id: 'f_tanvi', name: 'Tanvi Rao', hue: 280, headline: 'Data scientist from IIT Delhi. Looking for a business-minded partner.', has: ['Machine Learning', 'Backend', 'Research'], needs: ['Operations', 'Sales', 'Domain expertise'], commitment: 'Full-time', stage: 'Pre-seed', location: 'New Delhi', values: ['Transparent', 'Customer-obsessed', 'Bootstrapped'] },
];

export const SCHEMES: Scheme[] = [
  {
    id: 'sch_dpiit',
    name: 'DPIIT Recognition',
    body: 'Startup India',
    benefit: 'Tax holiday, easier compliance, access to every scheme below',
    rules: [
      { field: 'ageYears', op: 'lte', value: 10, label: 'Incorporated within the last 10 years' },
      { field: 'turnoverCr', op: 'lte', value: 100, label: 'Annual turnover under ₹100 Cr' },
    ],
  },
  {
    id: 'sch_sisfs',
    name: 'Startup India Seed Fund (SISFS)',
    body: 'DPIIT',
    benefit: 'Up to ₹50 lakh for proof of concept and prototype',
    rules: [
      { field: 'dpiitRegistered', op: 'eq', value: true, label: 'DPIIT recognised' },
      { field: 'ageYears', op: 'lte', value: 2, label: 'Incorporated within the last 2 years' },
      { field: 'hasPrototype', op: 'eq', value: false, label: 'Still at proof-of-concept stage (not commercialised)' },
    ],
  },
  {
    id: 'sch_cgss',
    name: 'Credit Guarantee Scheme for Startups',
    body: 'SIDBI',
    benefit: 'Collateral-free loans up to ₹10 Cr',
    rules: [
      { field: 'dpiitRegistered', op: 'eq', value: true, label: 'DPIIT recognised' },
      { field: 'turnoverCr', op: 'lte', value: 100, label: 'Annual turnover under ₹100 Cr' },
    ],
  },
  {
    id: 'sch_women',
    name: 'Women Entrepreneurship Platform grant',
    body: 'NITI Aayog',
    benefit: 'Mentorship, funding access and incubation support',
    rules: [{ field: 'womenLed', op: 'eq', value: true, label: 'Women-led (≥51% ownership)' }],
  },
  {
    id: 'sch_tech',
    name: 'Tech Sector Incubation Grant',
    body: 'MeitY',
    benefit: 'Up to ₹25 lakh plus incubator access',
    rules: [
      { field: 'sector', op: 'in', value: ['AI', 'SaaS', 'Deeptech', 'Fintech'], label: 'Sector is technology-led' },
      { field: 'stage', op: 'in', value: ['Idea', 'Pre-seed'], label: 'Idea or pre-seed stage' },
    ],
  },
];

export const INTERVIEW_QUESTIONS = [
  { q: 'Walk me through how React decides when to re-render a component, and one way you have avoided a needless re-render.', skill: 'React', hint: 'State, props, memoisation, keys.' },
  { q: 'You have a TypeScript function that accepts a union of three shapes. How do you narrow it safely without type assertions?', skill: 'TypeScript', hint: 'Discriminated unions, type guards.' },
  { q: 'A list of 10,000 rows is janky to scroll. How do you diagnose and fix it?', skill: 'React', hint: 'Profiling, virtualisation, memo.' },
  { q: 'Design the data model and API for a notification system that supports email, push and in-app.', skill: 'System Design', hint: 'Queues, fan-out, preferences.' },
  { q: 'Tell me about a time a design decision you made was wrong. What did you do?', skill: 'Communication', hint: 'Honesty, ownership, learning.' },
];

export const PROOF_FEED = [
  { name: 'Priya S.', skill: 'React', score: 86, ev: 'interview' as const },
  { name: 'Rohan I.', skill: 'Node.js', score: 91, ev: 'task' as const },
  { name: 'Ananya N.', skill: 'Figma', score: 88, ev: 'task' as const },
  { name: 'Kabir G.', skill: 'Python', score: 83, ev: 'interview' as const },
  { name: 'Ishita R.', skill: 'TypeScript', score: 90, ev: 'github' as const },
  { name: 'Dev K.', skill: 'Go', score: 79, ev: 'interview' as const },
  { name: 'Meera J.', skill: 'Flutter', score: 87, ev: 'task' as const },
  { name: 'Sahil B.', skill: 'AWS', score: 85, ev: 'interview' as const },
];
