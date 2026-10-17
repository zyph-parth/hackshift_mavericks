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
- **Verified score** weights skill level by the quality of evidence: self-reported, GitHub-verified, interview-verified, or task-verified.
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

## AI configuration

AI-assisted features are optional. Without an API key, LaunchLoop uses deterministic fallback logic so the full demo remains functional.

Set the following environment variable:

```bash
ANTHROPIC_API_KEY=your_key_here
```

To intentionally use fallback responses even with a key available:

```bash
AI_FALLBACK_ONLY=true
```

AI outputs are schema-validated and cached in the database. Current AI-supported flows include interview grading, startup idea validation, pitch-deck review, job-description drafting, and application-pitch generation.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `JWT_SECRET` | Development value | Secret used to sign tokens; set a strong value in production |
| `ANTHROPIC_API_KEY` | Not set | Enables live Claude-powered AI features |
| `AI_FALLBACK_ONLY` | `false` | Forces deterministic AI fallbacks |
| `DB_FILE` | `apps/api/data/launchloop.db` | SQLite database path |
| `SIMULATE_PAYMENTS` | `true` | Keeps proof-task payouts in demo/simulated mode |

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
