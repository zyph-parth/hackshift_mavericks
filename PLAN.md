# LaunchLoop: Execution Plan

> Companion to `doc.md` (the product spec). The spec says **what** to build. This file says **how**: the engineering decisions, the design system, the screen-by-screen UX, the build order and what "done" means.
> Rule: if this file and the spec disagree, this file wins. Update it when we change our minds.

---

## 0. Senior-dev decisions (changes and additions to the spec)

| # | Decision | Why |
|---|---|---|
| D1 | **npm workspaces monorepo**: `apps/web`, `apps/api`, `packages/shared` | One repo, one install, and frontend and backend share the same types |
| D2 | **`packages/shared` holds every zod schema** (API request/response + AI outputs) | The API contract lives in code, not in Slack. A backend change that breaks the frontend is a type error, not a stage failure |
| D3 | **Supabase** for Postgres + pgvector + Storage (instead of Neon + Cloudinary) | One vendor, one dashboard, one set of keys. pgvector is built in |
| D4 | **AI cache in Postgres** (`AiCache` table: `hash → json`), not in-memory LRU | Render/Railway restarts wipe memory, and a cold cache mid-demo is how demos die. Pre-warmed answers must survive restarts |
| D5 | **LLM provider behind `AIService`** with `generate<T>(promptId, input, schema)`. Default: Claude (`claude-sonnet-5-5` for grading/validation, `claude-haiku-5-5` for cheap/fast calls) | Swappable provider; per-feature model choice controls cost and latency |
| D6 | **Embeddings provider is configurable** (`EMBEDDING_DIM` in env). Default: Voyage `voyage-3.5-lite` (1024-d). Zero-cost fallback: local `all-MiniLM-L6-v2` via transformers.js (384-d) | Anthropic has no embeddings API. The dimension must be fixed before the first migration (see open decisions) |
| D7 | **API on Render/Railway as a long-lived server**, not serverless | Socket.io and the Razorpay webhook need a persistent process. Use a paid instance or keep-alive so it never cold-starts on stage |
| D8 | **Feature flags in env**: `DEMO_MODE`, `SIMULATE_PAYMENTS`, `AI_FALLBACK_ONLY` | Every risk in spec §16 gets a switch we can flip in 10 seconds |
| D9 | **Deterministic logic is pure functions with unit tests**: match score, co-founder compatibility, scheme rule engine, readiness score | These are the numbers judges will question. They must be right and explainable |
| D10 | **Access token in memory + httpOnly refresh cookie**; role guard middleware per route | Matches spec §11; no tokens in localStorage |
| D11 | **One `seed.ts` that tells a story**: Priya, Arjun and 2–3 named mentors are hand-written; the other 150 talents and 25 startups are generated | The demo script depends on specific people existing with specific scores |

---

## 1. Repo layout

```
hackshift_mavericks/
├── apps/
│   ├── web/                    # React + Vite + TS + Tailwind v4 + shadcn/ui
│   └── api/                    # Express + TS + Prisma + Socket.io
├── packages/
│   └── shared/                 # zod schemas, types, constants (roles, enums, evidence levels)
├── docs/
│   ├── PRODUCT_SPEC.md         # = doc.md
│   └── DEMO_SCRIPT.md
├── .github/workflows/ci.yml    # typecheck · lint · test
├── package.json                # workspaces + root scripts (dev runs web+api concurrently)
└── PLAN.md
```

Backend module and frontend feature folders follow spec §5.3 and §5.4 exactly.

**Tooling**: TypeScript strict, ESLint + Prettier, Vitest (api + shared), Playwright (3 smoke flows), `concurrently` for `npm run dev`, Husky pre-commit (lint-staged only, so it stays fast).

---

## 2. Design system: "Proof"

### 2.1 Design principles
1. **Evidence is the hero.** Every number on screen can be expanded to show *why*. No black-box scores.
2. **Calm surface, dramatic moments.** 90% of the UI is quiet and dense (Linear-like). The 5 hero moments get full cinematic motion.
3. **Every screen looks alive.** No empty states in the demo; real empty states still get designed (illustration + one CTA).
4. **Speed is a feature.** Optimistic updates, skeletons shaped like the content, and AI streaming text where possible. Nothing should sit on a spinner.

### 2.2 Visual language

**Theme**: "Paper & ink". Warm graphite at night, off-white paper by day, with full parity. No glows, noise, gradient blobs or cursor spotlights: the page is plain on purpose so the evidence carries it.

**Color tokens** (CSS variables, Tailwind v4 `@theme`):

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#141311` | `#F4F1EA` | page |
| `--surface` | `#1B1A17` | `#FFFDF8` | cards |
| `--surface-2` | `#22211D` | `#F8F5EE` | inputs, table footers |
| `--border` | `#2E2C28` | `#E2DDD1` | hairlines (1px everywhere) |
| `--text` | `#EDE9E1` | `#1D1B17` | primary |
| `--text-muted` | `#A8A299` | `#5B564D` | secondary |
| `--accent` | `#EE7044` | `#C8501F` | CTAs, focus, live states. **The only accent** |
| `--ev-self` | `#8A847B` grey | `#8D877C` | self-reported |
| `--ev-github` | `#6B9BEA` blue | `#2F62C9` | GitHub-verified |
| `--ev-interview` | `#B18CE8` purple | `#7B47C9` | interview-verified |
| `--ev-task` | `#5FB67E` green | `#2E8150` | task-verified |
| `--danger` / `--warn` | `#E2685D` / `#D9A441` | `#C23B2F` / `#A8700C` | |

The accent is orange so it never collides with the four evidence colors, which carry meaning.

**Typography**
- UI: **IBM Plex Sans** (400/500/600), 14px body.
- Titles: **Newsreader** (text serif, upright, weight 500) for every `h1` and large `h2`. No italic "magic word" in headlines.
- Numbers and labels: **IBM Plex Mono** with tabular figures for small numbers and for uppercase section labels, so they read like a spec sheet. Large figures (stats, scores) switch to Newsreader lining numerals.
- Scale: 11 (labels) / 13 / 14 (body) / 15 / 20 / 28 / 40 (page titles) / 86 (landing hero).

**Shape and depth**: radius 6px (cards), 5px (inputs, buttons), 4px (skill tags and badges; no pills). Depth comes from hairlines and one soft drop on hover, never from glow. Lists inside cards are divided rows, not cards inside cards. Glass only on the top nav and the command palette.

**Iconography**: Lucide, 16px, 1.5 stroke.

### 2.3 Motion system (Motion for React, `motion` package)
| Token | Value | Use |
|---|---|---|
| `fast` | 120ms ease-out | hovers, toggles |
| `base` | 220ms `cubic-bezier(.2,.8,.2,1)` | panels, popovers |
| `spring` | stiffness 260, damping 26 | layout reorders, cards |
| `hero` | 900–1400ms orchestrated | the 5 hero moments only |

- `prefers-reduced-motion` turns every animation into a fade. Not optional.
- Page transitions: 8px rise + fade, never a full slide.
- Numbers always **count up** (tabular figures) and never just appear.

### 2.4 Signature components (build these first, polish them most)
| Component | What makes it premium |
|---|---|
| `MatchScoreRing` | SVG ring with gradient stroke, animated `pathLength`, count-up number in the center, color shifting red→amber→green by score. Hover opens an `ExplainPopover` with the formula breakdown bars (semantic / skill / verified / fit) |
| `SkillChip` | Pill with a dot in the evidence color. On upgrade (self → interview) it does a **flip + glow pulse** in the new color. Tooltip shows the evidence source ("Verified in AI interview, Oct 17, 4/5") |
| `VoiceOrb` | Interview-room centerpiece. Audio-reactive blob (Web Audio `AnalyserNode` → CSS/SVG scale and blur). Three states: AI speaking (orange, slow breathing), listening (reacts to your voice), thinking (shimmer) |
| `ScoreReveal` | Full-screen moment after the interview: dims the background, the ring fills, per-skill bars cascade in, then skill chips flip to purple one by one (staggered 80ms) |
| `ShortlistBoard` | AI-ranked list. Submissions arrive "unsorted", then **animate into rank order** with layout springs while AI scores tick in. This is the founder hero moment |
| `ReadinessRadar` | Recharts radar with a draw-in animation; each axis is clickable and opens its next actions |
| `ExplainPopover` | Reusable "why this number" card used by every score on the platform |
| `CommandPalette` | ⌘K (cmdk): jump to any page, switch role, "Start interview", search talent in natural language |
| `RoleSwitcher` | Segmented control in the nav; switching role cross-fades the sidebar and the dashboard |
| `AIStreamText` | Typewriter-style streaming for AI output (validator, explanations), with a skeleton shaped like the final cards |

### 2.5 App shell
- **Left sidebar** (collapsible to icons, 240px → 64px) with nav items that change per role. **Top bar**: breadcrumb, ⌘K trigger, notifications bell (live count), role switcher, avatar.
- Content max-width 1200px; dashboards use a **bento grid** (12-col, cards of mixed spans).
- Mobile: the sidebar becomes a bottom tab bar (5 items), cards stack, and the interview room stays fully usable on a phone.

---

## 3. Screen-by-screen UX (15 screens)

### Hero screens (most design time goes here)

**1. Landing** `/`
- Hero: "Hire by *proof*, not resumes." with two CTAs (I'm talent / I'm building a startup). Behind it, a slowly drifting **live proof feed**: cards like "Priya · React verified · 86" float up (from seed data).
- Live counters (count-up on scroll): verified talents, startups, proof tasks paid, mentor hours.
- "The loop" section: the two loops from spec §3.2 as an animated, scroll-driven diagram.
- Bento grid of features, each card with a looping micro-demo (ring filling, chip flipping, shortlist reordering).
- 3 role cards → onboarding. Footer.
- Smooth scroll (Lenis), scroll-linked reveals.

**2. Interview room** `/interview/:id`
- Distraction-free full screen. VoiceOrb in the center, question text above it (fades in word by word while TTS reads it), live transcript below in muted text that solidifies as words are recognized.
- Top: progress dots (1/5), a timer, and a small "integrity" indicator that stays honest without being scary.
- Bottom: big mic button (space bar = push-to-talk), "Switch to typing" fallback, "Next question".
- Tab switch → a gentle toast ("We noticed you left the tab"), logged as a signal.
- End → **ScoreReveal** → "See your new matches" (matches re-rank live).

**3. Jobs & matches** `/jobs`
- Left: filters (role, remote, stipend, equity, stage). Right: job cards, each with a MatchScoreRing, top 3 skills as SkillChips (matched = evidence color, missing = dashed outline), and a one-line AI "why".
- A "Sorted by match" toggle animates the reorder.
- Job detail opens as a **side sheet** (no page change): explanation, skill gap, "Get 2-week roadmap", one-click apply with an editable AI pitch note.

**4. Proof Task review (founder)** `/tasks/:id/review`
- Header: task, reward, deadline, "48 submissions · AI reviewed".
- ShortlistBoard: rows with rank, avatar, AI score, recommendation badge (shortlist / maybe / reject), meets/missing chips. Click → split view with the submission on the left and the AI review on the right.
- "Accept" → Razorpay payout modal → confetti-free success (a subtle green sweep) → "Hire Priya" CTA → the task-verified chip appears on her profile.

**5. Founder Studio** `/studio`
- Step 1: a single large textarea, "Describe your idea in 3 lines". Submit → AIStreamText fills the cards: Problem, Target user, Market size, Competitors (logo-less mini table), Risks, Lean Canvas (9-cell grid).
- Step 2: ReadinessRadar + score + next actions as a checklist.
- Tabs: Schemes (eligible ✓ / missing info ? / not eligible ✗ with the exact rule that failed), Co-founders, Pitch deck review.

### Supporting screens
| # | Screen | Key UX |
|---|---|---|
| 6 | Auth `/login` `/signup` | Split layout: form left, rotating testimonial/proof card right. Google one-tap first |
| 7 | Onboarding `/onboarding` | 3 steps: pick roles (multi-select cards) → role basics → "Upload resume" (talent) or "Describe idea" (founder). Progress bar, skippable |
| 8 | Talent dashboard | Bento: Verified Score ring, profile strength, top 3 matches, active tasks, skill-gap roadmap progress, upcoming mentor session |
| 9 | Profile editor + public profile `/u/:username` | Resume upload shows parsing as a scan line over the PDF, then fields fill in one by one. Public profile = shareable proof page (OG image with the score) |
| 10 | Interview report `/interview/:id/report` | Per-question score, transcript, feedback, strengths/improvements, "Retake (2 left)" |
| 11 | Tasks board `/tasks` | Cards with reward front and center (₹ in Newsreader numerals), deadline countdown, "Funded ✓" badge |
| 12 | Task detail / submit | Brief, rubric, submit (link / file / text), then live AI pre-review status |
| 13 | Co-founder matches `/studio/cofounders` | Card stack with compatibility %, a have/need Venn-style overlap, "Why you two", 3 trial-project ideas, "Propose trial" |
| 14 | Mentor directory + booking `/mentors` | Grid with AI "Recommended for your stage" row on top. Booking sheet: calendar slots → goal → pay (₹499 via Razorpay / free) → Jitsi link + add to calendar |
| 15 | Recruiter console `/recruiter` | Jobs list → shortlist (same ShortlistBoard component) → Kanban pipeline (dnd-kit). Natural-language talent search in the ⌘K palette |

**Every screen ships with 4 states**: loading (content-shaped skeleton), empty (illustration + 1 CTA), error (human message + retry), and success.

---

## 4. Frontend architecture

| Concern | Choice |
|---|---|
| Build | Vite + React 19 + TypeScript strict |
| Styling | Tailwind v4 (`@theme` tokens from §2.2) + shadcn/ui (restyled to our tokens; no default shadcn look) |
| Routing | React Router (data routers), lazy-loaded route chunks, role-guarded layouts |
| Server state | TanStack Query: typed hooks per endpoint generated from `packages/shared` schemas |
| Client state | Zustand: auth session, active role, UI prefs |
| Forms | react-hook-form + zodResolver (same schemas as the backend) |
| Motion | `motion` (Framer Motion), Lenis on the landing page only |
| Charts | Recharts (radar, bars), custom SVG for rings |
| Realtime | socket.io-client, one provider, events feed TanStack Query cache invalidation |
| Voice | `useSpeechRecognition` / `useSpeechSynthesis` hooks wrapping the Web Speech API, with a typed-answer fallback |
| Quality | Lighthouse ≥ 90 on landing, axe clean on the hero screens, keyboard-navigable, visible focus rings in accent |

---

## 5. Backend architecture

- Module pattern per spec §5.3: `routes → controller → service`, zod validation middleware on every route using `packages/shared` schemas.
- **Central error handler** returning `{ error: { code, message, details } }`; never leak stack traces.
- **AIService** (`lib/ai/`):
  ```
  generate<T>({ promptId, version, input, schema, model, temperature })
    → hash(promptId+version+input) → AiCache hit? return
    → LLM call (timeout 20s, structured JSON) → schema.parse
    → fail? one repair retry ("fix to match schema") → fail? typed fallback
    → write AiCache, log tokens + latency per promptId
  ```
  Prompts are versioned files; changing a prompt bumps the version, which invalidates its cache.
- **Bias guard**: grading and ranking prompts receive profiles with name, gender, college and photo stripped (spec §11).
- **Matching** (spec §7.2): pgvector top-50 by cosine → formula in TS (pure, tested) → LLM explains top 10 only (cached per user+job).
- **Background work**: a simple in-process job queue for embeddings and re-scoring after an interview (BullMQ is the production path).
- **Payments**: Razorpay order → checkout on the client → **webhook with signature verification** is the only thing that marks a payment paid. `SIMULATE_PAYMENTS=true` short-circuits to a fake verified payment.
- **Security**: helmet, CORS allow-list (`CLIENT_URL`), rate limits (auth: 10/min, AI: 20/min/user), bcrypt, upload limits (PDF only, 5 MB).
- **Observability**: pino structured logs with request ids; `/health` endpoint; Sentry if time allows.

---

## 6. Build order

The phases below map onto the spec's 24h timeline (§13). P0 always comes before P1.

### Phase 0: Setup (hour 0–1, all together)
- [ ] Monorepo scaffold, workspaces, TS/ESLint/Prettier, CI
- [ ] `packages/shared`: enums + first schemas (User, TalentProfile, Job, AI outputs for resume parse and interview)
- [ ] Supabase project with pgvector, Razorpay test keys, LLM + embedding keys, Google OAuth client
- [ ] Deploy the empty skeleton to Vercel + Render on day 0 (deployment problems are found now, not at hour 20)
- [ ] Lock the embedding dimension and write the first Prisma migration

### Phase 1: Foundation (1–4)
- **Design**: tokens, fonts, app shell, sidebar, top bar, ⌘K, role switcher, all shadcn primitives restyled
- **Signature components in isolation**: MatchScoreRing, SkillChip, VoiceOrb (mock audio)
- **API**: auth (email + Google), `/me`, role guard, error handler, AIService + AiCache, resume parse

### Phase 2: Talent loop (4–12) → **checkpoint at hour 12: Flow 1 works end to end on the deployed URL**
- Onboarding, profile editor with resume scan animation, public profile
- Interview: question generation → voice room → answers + signals → grading → ScoreReveal → skills become interview-verified
- Embeddings, match engine, jobs board with explanations, one-click apply
- Proof Tasks: post, submit, AI pre-review, accept → task-verified evidence
- Seed script v1 (Priya, Arjun, jobs, tasks)

### Phase 3: Venture loop + mentors (12–18)
- Founder Studio: validator, readiness radar, scheme rule engine, co-founder matching
- Recruiter: AI JD writer, ShortlistBoard, Kanban (P1)
- Mentors: directory, slots, booking, Jitsi links, Razorpay checkout
- Socket.io notifications + chat (P1)
- Landing page at full polish

### Phase 4: Polish + harden (18–20)
- Full demo run on production, fix what breaks
- Motion pass on all 5 hero moments; light-mode pass; mobile pass
- Loading/empty/error states everywhere
- Playwright smoke tests for flows 1–3

### Phase 5: Freeze + ship (20–24)
- **Feature freeze at hour 20**
- Pre-warm the AI cache by running every demo flow; record the backup video
- Slides, rehearse the pitch 3× with a timer, Q&A prep

### If we fall behind, cut in this order
Chat → Kanban → pitch deck reviewer → GitHub import → skill-gap roadmap → co-founder trial project → venture journey tracker. **Never cut**: voice interview, ScoreReveal, match explanations, the AI-ranked shortlist, payment.

---

## 7. Definition of done (for every feature)

- [ ] Works on the **deployed** URL, not just localhost
- [ ] Request and response validated by shared zod schemas
- [ ] Loading, empty, error and success states designed
- [ ] Works in dark and light mode and at 375px width
- [ ] AI calls are cached and have a fallback
- [ ] Seed data makes it look alive
- [ ] Merged to `main` (merge every 2 hours, small PRs, one reviewer)

---

## 8. Team split

Spec §13 roles, plus design ownership:

| Person | Owns | Design responsibility |
|---|---|---|
| P1: Frontend lead | Design system, shell, landing, talent dashboard, profile, matches | **Owns the "Proof" design system** and the final visual QA of every screen |
| P2: Frontend features | Interview room, Founder Studio, tasks, mentors, recruiter | Builds VoiceOrb, ScoreReveal, ShortlistBoard, ReadinessRadar |
| P3: Backend + AI | AIService, prompts, grading, matching, validator, task review | Owns AI output quality and the pre-warmed cache |
| P4: Backend core + DevOps + pitch | Schema, auth, CRUD, seed, payments, sockets, deploy, slides | Owns the seed story and the demo script |

---

## 9. Open decisions (need answers before coding)

1. **LLM provider**: Claude (recommended, per D5) or something else your team already has credits for?
2. **Embeddings**: Voyage (1024-d, needs a key), OpenAI `text-embedding-3-small` (1536-d), or local MiniLM (384-d, free, no key)?
3. **Name**: keep "LaunchLoop" or rename now (it changes the logo, domain, Jitsi room prefix and copy)?
4. **Time box**: a true 24h hackathon, or more time? With more time, P1 features and a production-hardening pass (BullMQ, Redis, Sentry, E2E coverage) move into scope.
5. **Accounts**: do we already have Supabase, Razorpay test, Google OAuth, Vercel and Render set up?
