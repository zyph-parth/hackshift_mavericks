export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  tag: 'Talent' | 'Founders' | 'Hiring' | 'Product';
  read: string;
  date: string;
  body: { h?: string; p: string }[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'pass-the-ai-interview',
    title: 'How to get a high score on the LaunchLoop voice interview',
    excerpt: 'Five habits that move an answer from 60 to 90, with examples. No tricks, just structure.',
    tag: 'Talent',
    read: '6 min',
    date: 'Oct 12, 2026',
    body: [
      { p: 'The interview is five questions, about ten minutes, and it exists for one reason: to turn a claim on your profile into evidence a founder can trust. The grader is not looking for a perfect textbook answer. It is looking for the signals a senior engineer listens for in a real conversation.' },
      { h: '1. Start with the one-sentence answer', p: 'Say the conclusion first, then justify it. “React re-renders a component when its state or props change, or when its parent re-renders” beats a long wind-up. If the first sentence is right, the next three can add depth instead of rescuing you.' },
      { h: '2. Name the trade-off', p: 'Almost every real engineering decision is a trade-off. When you say “I would use memoisation here”, add what it costs: memory, stale closures, and complexity. Naming the cost is the single biggest tell of someone who has done the work.' },
      { h: '3. Use one concrete example', p: 'One specific story from a project, with a number if you have it, outweighs five general statements. “We cut a 10,000-row table from 1.8s to 140ms with windowing” is worth more than a paragraph on theory.' },
      { h: '4. Think out loud on the hard ones', p: 'You are allowed to reason aloud: “There are two approaches. The first is simple but doesn’t scale; the second…”. Silence reads as stuck. Structured thinking reads as senior.' },
      { h: '5. Be honest about gaps', p: 'If you have not used something, say so and explain how you would approach it. Bluffing is the fastest way to lose points, and the integrity signal looks at consistency across your answers. You get three attempts, so use the first as practice.' },
      { p: 'After you finish, every skill you were tested on flips from self-reported to interview-verified, your matches re-rank immediately, and your report shows exactly what the grader heard.' },
    ],
  },
  {
    slug: 'write-a-proof-task',
    title: 'How to write a proof task that attracts great candidates',
    excerpt: 'A good task is small, paid, and scored against a rubric you publish. Here is the template that works.',
    tag: 'Hiring',
    read: '5 min',
    date: 'Oct 9, 2026',
    body: [
      { p: 'Proof tasks replace the resume screen and the take-home that nobody finishes. The best ones take a strong candidate two to four hours, pay fairly, and tell the candidate exactly how they will be judged.' },
      { h: 'Keep it to one decision', p: 'A task should test one real thing you need: build this component, design this endpoint, critique this flow. If you cannot describe it in three sentences, it is a project, not a task.' },
      { h: 'Pay for it', p: 'Unpaid work filters for people with free time, not people with skill. Tasks on LaunchLoop are funded before they open, so candidates know the reward is real. Rates of ₹1,500 to ₹5,000 work for two to four hours.' },
      { h: 'Publish the rubric', p: 'List three to five criteria in plain language: “works at 360px wide”, “handles a retry safely”, “write-up names the failure modes”. The AI review scores submissions against the same list, which makes the ranking explainable and keeps it consistent.' },
      { h: 'Review blind', p: 'Names, colleges and photos are hidden by default while you review. You will be surprised how often the ranking changes once the signal is only the work. Identity is revealed after you accept.' },
      { p: 'Accepting a submission releases the payment and upgrades the candidate’s skills to task-verified, the strongest evidence on the platform.' },
    ],
  },
  {
    slug: 'startup-schemes-india',
    title: 'The government schemes most Indian startups forget to check',
    excerpt: 'DPIIT recognition unlocks most of them. Here is how the rules actually work and where founders get stuck.',
    tag: 'Founders',
    read: '7 min',
    date: 'Oct 4, 2026',
    body: [
      { p: 'Most early-stage founders know about one or two schemes and miss the rest. The reason is simple: the rules live in different places and each has slightly different conditions. The Schemes tab in Founder Studio checks your facts against every rule and shows the exact rule that failed, which is the part most portals hide.' },
      { h: 'Start with DPIIT recognition', p: 'Recognition by the Department for Promotion of Industry and Internal Trade is the key that unlocks most of the rest: the tax holiday, easier compliance, and eligibility for the seed fund and credit guarantee. The core conditions are age under ten years and turnover under ₹100 Cr.' },
      { h: 'The Seed Fund is for proof of concept', p: 'The Startup India Seed Fund Scheme supports prototypes and early validation, up to roughly ₹50 lakh through approved incubators. It generally expects the company to be recently incorporated and not yet commercialised. This is the rule founders most often trip over: a startup that has already launched can fail the stage test.' },
      { h: 'Credit without collateral', p: 'The credit guarantee scheme backs loans so lenders do not demand collateral. It requires recognition and is meant for companies with some revenue or clear repayment ability.' },
      { h: 'Check the “unknown” rows', p: 'When the Studio shows “Need more info”, it is not a rejection. It means a rule depends on a fact you have not told us yet. Fill it in and the verdict updates instantly.' },
      { p: 'Always confirm the final eligibility on the official portal before applying. Rules and caps change, and this tool is a fast first filter, not legal advice.' },
    ],
  },
  {
    slug: 'read-your-match-score',
    title: 'Reading your match score: what the four bars mean',
    excerpt: 'Every match on LaunchLoop shows its formula. Here is what each component measures and how to move it.',
    tag: 'Product',
    read: '4 min',
    date: 'Sep 29, 2026',
    body: [
      { p: 'A match score you cannot inspect is just a number. Hover any ring on LaunchLoop and you see the full breakdown. The final score is a weighted sum of four components.' },
      { h: 'Semantic fit (35%)', p: 'How close your overall profile is to the role, beyond exact keyword matches. A frontend engineer who writes about design systems is close to a design-systems role even if the exact phrase is missing. To improve it, write a specific headline and bio.' },
      { h: 'Skill overlap (35%)', p: 'For each required skill, we look at your level, weighted by how important the role says that skill is. Missing skills score zero for that line and are listed as gaps with a suggested roadmap.' },
      { h: 'Verified evidence (20%)', p: 'The same skill counts more when it is proven. Self-reported counts 0.3, imported GitHub activity 0.5, interview-verified 0.9 and task-verified 1.0. Only the last two are assessed by us, and only those count toward your verified score. This is why taking the interview is the fastest way to lift every match at once.' },
      { h: 'Role fit (10%)', p: 'Remote preference, job type and location. A small component on purpose, because it should never outweigh actual ability.' },
      { p: 'The formula is deterministic and tested. The AI only writes the one-line explanation, never the number.' },
    ],
  },
];

export const FAQ: { q: string; a: string; group: 'Talent' | 'Hiring' | 'Platform' }[] = [
  { group: 'Platform', q: 'What is LaunchLoop?', a: 'A hiring and venture platform built around proof. Talent proves skills through a voice interview and paid tasks, and can link a GitHub account they own. Founders validate ideas, check government schemes and find co-founders. Recruiters rank blind submissions and hire from proven work.' },
  { group: 'Platform', q: 'How do you verify skills?', a: 'Four evidence levels, each shown on every skill: self-reported, GitHub activity, interview-verified and task-verified. Only the last two are assessed by us. GitHub activity is imported from an account you proved you own, and says you write code, not how well. You can never edit an assessed level yourself.' },
  { group: 'Platform', q: 'Is the AI making hiring decisions?', a: 'No. AI drafts explanations, grades interview answers and opens submitted repos and sites and checks them against a published rubric, saying what it could not assess. Match scores come from a transparent formula, and a human always accepts, rejects or hires.' },
  { group: 'Platform', q: 'How do you reduce bias?', a: 'Grading and ranking see profiles without name, gender, college or photo. Recruiters review submissions blind by default, and identity is revealed only after they accept.' },
  { group: 'Talent', q: 'What does the voice interview cost?', a: 'Nothing. You get three attempts. Each is five questions, about ten minutes, and you can switch to typing at any time.' },
  { group: 'Talent', q: 'Can I get paid?', a: 'Yes. Proof tasks are funded before they open. When a founder accepts your submission the reward is released and the skills it covers become task-verified.' },
  { group: 'Talent', q: 'Who sees my profile?', a: 'Signed-in recruiters and founders can find you by skill. Your email is never shown. You can control what you are open to from Settings.' },
  { group: 'Hiring', q: 'How much does it cost to hire?', a: 'Posting roles is free. You fund proof tasks up front; a small platform fee applies when you accept a submission. See Pricing for current numbers.' },
  { group: 'Hiring', q: 'What stops fake or copied submissions?', a: 'Each submission is reviewed against your rubric and linked artifacts. You can see the AI’s reasoning, which rubric points were met, and decide for yourself. Candidates can submit once per task.' },
  { group: 'Platform', q: 'Is my data safe?', a: 'Passwords are hashed with scrypt, sessions use short-lived tokens plus an httpOnly refresh cookie, and requests are rate limited. You can delete your account from Settings.' },
];

export const PRICING = [
  { name: 'Talent', price: '₹0', per: 'forever', blurb: 'Everything you need to prove yourself and get hired.', features: ['3 AI voice interviews', 'GitHub account linking', 'Unlimited applications', 'Match explanations', 'Public proof profile', 'Paid proof tasks'], cta: 'Start free', highlight: false },
  { name: 'Founder', price: '₹999', per: 'per month', blurb: 'Validate, fund and build your first team.', features: ['Idea validator and Lean Canvas', 'Readiness radar', 'Scheme eligibility checker', 'Co-founder matching', 'Pitch deck review', 'Post roles and tasks'], cta: 'Start free for 14 days', highlight: true },
  { name: 'Recruiter', price: '8%', per: 'of task rewards', blurb: 'Pay only when you find someone worth hiring.', features: ['Unlimited roles', 'Blind AI-ranked shortlists', 'Kanban pipeline', 'Verified talent search', 'AI job description writer', 'Escrow-funded tasks'], cta: 'Start hiring', highlight: false },
];

export const SKILL_SUGGESTIONS = ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'PostgreSQL', 'Figma', 'Go', 'Next.js', 'Tailwind', 'Docker', 'AWS', 'Flutter', 'Machine Learning', 'System Design', 'Sales', 'Marketing', 'Product Management', 'Operations', 'UI Design'];
export const FOUNDER_SKILLS = ['Sales', 'Operations', 'Backend', 'Frontend', 'Machine Learning', 'Product design', 'Marketing', 'Finance', 'Domain expertise', 'DevOps', 'Research'];
export const FOUNDER_VALUES = ['Ship fast', 'Customer-obsessed', 'Transparent', 'Bootstrapped', 'Craft', 'Impact first'];
