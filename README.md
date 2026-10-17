# LaunchLoop

**Hire by proof, not by resumes.**

LaunchLoop is an entrepreneurship and talent ecosystem for early-stage startups. It helps talented people demonstrate what they can do, gives founders practical tools to validate and build their ventures, and enables recruiters to discover candidates through verified evidence rather than credentials alone.

The product is designed around one continuous loop:

> **Learn and prove skills -> earn verified evidence -> discover better opportunities -> help stronger startups get built.**

## Why LaunchLoop

Traditional hiring often relies on resumes, college names, and self-reported skills. At the same time, early-stage founders struggle to find credible collaborators, validate their ideas, navigate funding schemes, and hire quickly with limited resources.

LaunchLoop addresses both sides of this problem by making proof visible and actionable:

- Talent builds a profile backed by interviews, GitHub signals, and completed paid tasks.
- Founders validate an idea, assess venture readiness, find co-founders, mentors, and relevant schemes.
- Recruiters and founders evaluate applicants through skills, submitted work, and explainable matching scores.
- Mentors help founders and talent move from intention to action through bookable sessions.

## Core capabilities

### For talent

- Create a professional profile with skills, experience, availability, and evidence level.
- Import resume content and connect GitHub-based proof.
- Complete skill interviews with feedback and a verified-score outcome.
- Discover jobs ranked by an explainable match score.
- Apply with an AI-assisted pitch note and track applications.
- Participate in paid proof tasks and convert completed work into task-verified evidence.

### For founders

- Describe a startup idea and receive an AI-assisted validation: problem, target user, market, competitors, risks, and Lean Canvas.
- Track a venture-readiness score across problem clarity, market, product, team, traction, and funding fit.
- Check eligibility for startup schemes using transparent rule-based criteria.
- Review pitch-deck text with actionable section-by-section feedback.
- Discover compatible co-founders based on complementary skills, commitment, stage, and shared values.
- Find mentors, book sessions, and manage startup communication.

### For recruiters and startup teams

- Publish jobs and paid proof tasks.
- Search and evaluate talent using skills and evidence rather than a resume alone.
- Review applications and task submissions in a structured workflow.
- Use AI-assisted shortlisting while retaining transparent score breakdowns.
- Move successful candidates from proof task to hiring decision.

## Product principles

1. **Evidence over claims** — A skill becomes more valuable when it is demonstrated through an interview, GitHub work, or a completed task.
2. **Explainable decisions** — Match, readiness, scheme, and co-founder scores are based on visible inputs and deterministic logic where possible.
3. **Useful AI, not opaque AI** — AI helps generate feedback, validate ideas, review decks, and draft content; the application continues working through deterministic fallbacks when no API key is configured.
4. **One ecosystem, not isolated tools** — The same platform supports the journey from aspiring builder to verified talent, co-founder, startup team member, or founder.

## User roles and demo journey

LaunchLoop includes role-specific dashboards and workflows for:

| Role | Main journey |
| --- | --- |
| Talent | Build profile -> complete interview -> discover matches -> apply or submit proof tasks |
| Founder | Validate idea -> assess readiness -> explore schemes, mentors, and co-founders -> hire talent |
| Recruiter | Create opportunity -> shortlist evidence-backed candidates -> review task submissions -> hire |
| Mentor | Receive bookings and communicate with founders or talent |

For a concise hackathon demo, use this story:

1. Log in as **Priya**, complete or view a skill interview, and show how verified evidence improves her opportunity profile.
2. Open Jobs or Tasks to show matching and proof-based application flows.
3. Switch to **Arjun**, use Founder Studio to validate an idea and inspect readiness, schemes, and co-founder matches.
4. Switch to the recruiter account to review a proof-task submission and make a hiring decision.

## Technology overview

LaunchLoop is an npm-workspaces monorepo written in TypeScript.

| Area | Implementation |
| --- | --- |
| Web application | React 19, Vite, React Router, Tailwind CSS v4 |
| Client data and state | TanStack Query and Zustand |
| UI and visualization | Motion, Recharts, Lucide icons, custom proof/evidence components |
| API | Express 5 with TypeScript and Zod validation |
| Data store | Local SQLite via Node's built-in `node:sqlite` |
| Authentication | Scrypt password hashing, JWT access tokens, httpOnly refresh cookie |
| AI | Claude API when configured, with schema validation, caching, retry behavior, and deterministic fallbacks |
| Shared domain logic | Pure TypeScript engines for matching, readiness, schemes, and co-founder compatibility |

### Repository structure

```text
apps/
  api/                 Express API, authentication, persistence, AI integration, seed data
  web/                 React application and role-based product screens
packages/
  shared/              Shared types, seed data, and tested decision engines
PLAN.md                Product, UX, and implementation plan
```

## Explainable scoring

The scores shown in LaunchLoop are designed to be interpretable.

- **Job match score** combines role relevance, required-skill coverage, strength of verification, and work-preference fit.
- **Verified score** counts only skills we assessed (interview-verified and task-verified). Self-reported claims and imported GitHub activity are shown but add nothing to it.
- **Venture readiness** measures six dimensions: problem clarity, market, product, team, traction, and funding fit.
- **Scheme eligibility** evaluates each stated rule and returns eligible, ineligible, or more-information-needed.
- **Co-founder compatibility** considers complementary skills, commitment, startup stage, and shared values.

These engines live in `packages/shared`, so the frontend and backend share the same rules and product behavior stays consistent.

## Getting started

### Prerequisites

- Node.js 24 or later
- npm

### Install and run

```bash
npm install
npm run dev
```

This starts:

- API: `http://localhost:4000`
- Web app: `http://localhost:5173`

The local SQLite database is created and seeded automatically in `apps/api/data/` on first run.

### Demo accounts

All demo accounts use the password `demo1234`.

| Role | Email |
| --- | --- |
| Talent | `priya@demo.dev` |
| Founder | `arjun@demo.dev` |
| Recruiter | `recruiter@demo.dev` |
| Mentor | `mentor@demo.dev` |

You can also sign up with a new account and build a profile from scratch.

## How proof is checked

- **Proof tasks.** Submit a public GitHub repo or a live URL. The API opens it (static inspection only, nothing is executed) and checks each rubric criterion against what is really there: files, tests, README, accessibility attributes, media queries, commit history. A criterion no check covers is shown as *needs a human look*, never guessed. If a model is configured it may judge only those leftover criteria, and its answer counts only if it quotes text that exists in the inspected files. A write-up alone is not scored. Notes also flag work that predates the task, forks, repos shared by two candidates, and repos the submitter did not author.
- **GitHub.** Typing a username proves nothing. Linking takes a one-time code placed in a public gist on that account. Imported repo activity is labelled *GitHub activity*, capped at 60, and never counts toward the verified score. Only the interview and accepted proof tasks do.
- **Pro plan (Razorpay).** Settings > Plan opens Razorpay Checkout for an order the server created at a server-set price. The checkout signature is verified with the key secret, the payment is re-fetched from Razorpay and matched to the order and amount, and only then is Pro granted for 30 days (extendable). Point a Razorpay webhook for `payment.captured` at `/api/billing/webhook`; it is accepted only with a valid signature and is idempotent. Pro raises interview attempts from 3 to 10.
- Fetching candidate-supplied URLs is SSRF-guarded (public addresses only, checked at connect time). Set `GITHUB_TOKEN` to lift GitHub's 60 requests/hour anonymous limit.

## AI configuration

AI-assisted features are optional. Without an API key, LaunchLoop uses deterministic fallback logic so the full demo remains functional.

Put `GROQ_API_KEY` in `apps/api/.env` (see `apps/api/.env.example`). `openai/gpt-oss-120b` handles grading and analysis, `openai/gpt-oss-20b` quick drafts.

To intentionally use fallback responses even with a key available:

```bash
AI_FALLBACK_ONLY=true
```

AI outputs are schema-validated and cached in the database. Current AI-supported flows include interview grading, startup idea validation, pitch-deck review, job-description drafting, application-pitch generation, and the model step of proof-task review (see below). Fallback answers are not cached.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `JWT_SECRET` | Development value | Secret used to sign tokens; set a strong value in production |
| `GROQ_API_KEY` | Not set | Enables live AI (Groq) |
| `AI_FALLBACK_ONLY` | `false` | Forces deterministic AI fallbacks |
| `DB_FILE` | `apps/api/data/launchloop.db` | SQLite database path |
| `SIMULATE_PAYMENTS` | `true` | Keeps proof-task payouts in demo/simulated mode |
| `GITHUB_TOKEN` | Not set | Optional. Raises the GitHub API rate limit for proof inspections |
| `RZP_KEY_ID`, `RZP_KEY_SECRET` | Not set | Razorpay keys for the Pro plan (`rzp_test_` keys are test mode) |
| `RZP_WEBHOOK_SECRET` | Not set | Secret set on the Razorpay webhook; needed to accept `POST /api/billing/webhook` |
| `PRO_PRICE_INR` | `999` | Price of 30 days of Pro, set on the server only |

## Available commands

```bash
npm run dev         # Start API and web app together
npm run typecheck   # Type-check web and API projects
npm test            # Run shared decision-engine tests
npm run build       # Create a production web build
```

## Hackathon scope and next steps

LaunchLoop is built as a hackathon-ready product with complete local flows, seeded stories, role-based demos, and simulated payment behavior. For production, the natural next steps are:

- Move persistence from local SQLite to managed Postgres.
- Add real payment-provider checkout and webhook verification.
- Add robust file storage and secure resume/task attachment handling.
- Integrate production-grade semantic search and embeddings.
- Add audit trails, stronger authorization controls, observability, and end-to-end test coverage.

## Team message

LaunchLoop is not only a hiring platform. It is a practical support system for people who want to build: helping them prove their ability, find the right collaborators, validate ideas, and turn early effort into credible opportunity.
