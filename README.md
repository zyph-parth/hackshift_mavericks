# LaunchLoop

Hire by proof, not resumes. Verified talent, funded proof tasks, a founder studio and mentors in one loop. See [PLAN.md](PLAN.md) for the design system and product plan.

## Run it

```bash
npm install
npm run dev        # API on :4000, web on :5173 (Vite proxies /api)
```

Open http://localhost:5173. A SQLite database is created and seeded on first run (`apps/api/data/`).

**Demo accounts** (password `demo1234`): `priya@demo.dev` (talent), `arjun@demo.dev` (founder), `recruiter@demo.dev`, `mentor@demo.dev`. Or sign up as a brand-new user and build a profile from scratch.

## Layout

- `apps/web` React 19 + Vite + Tailwind v4 + Motion + TanStack Query
- `apps/api` Express 5 + node:sqlite, scrypt passwords, JWT access token (memory) + httpOnly refresh cookie
- `packages/shared` types, seed data and the pure, unit-tested engines (match score, scheme rules, readiness, co-founder fit, AI fallbacks)

## AI

Set `ANTHROPIC_API_KEY` to use Claude for interview grading, idea validation, pitch notes and JDs. Without it, deterministic fallbacks run so every feature still works. Results are cached in the database. `AI_FALLBACK_ONLY=true` forces the fallbacks.

## Env

| Var | Default | Purpose |
|---|---|---|
| `PORT` | 4000 | API port |
| `JWT_SECRET` | dev value | **Set in production** |
| `ANTHROPIC_API_KEY` | none | Enables live AI |
| `DB_FILE` | `apps/api/data/launchloop.db` | SQLite path |
| `SIMULATE_PAYMENTS` | true | Payments are simulated (no Razorpay yet) |

## Scripts

`npm run typecheck` · `npm test` · `npm run build`
