# MathMentor - Development Notes for OpenCode Agents

## Setup
```
cp .env.local.example .env.local  &&  yarn install  &&  yarn prisma generate  &&  yarn prisma db push  &&  yarn prisma db seed
```
`prisma db seed` runs `scripts/safe-seed.ts` which blocks `prisma.delete` / `prisma.deleteMany` calls in `seed.ts` (to protect production data). Do not add delete operations to seed.

## Key env vars
- `DATABASE_URL` — Supabase pgbouncer (port 6543). `DIRECT_URL` — direct session (port 5432).
- `ABACUSAI_API_KEY` — required for LLM calls.
- `.env` `LLM_PROVIDER` and `OLLAMA_*` vars exist but are **never used by code**. Ignore them.

## Architecture

| Layer | Path | Notes |
|-------|------|-------|
| Next.js 14 App Router (App Router) | `app/` | `distDir` configurable via `NEXT_DIST_DIR`. `output` mode configurable via `NEXT_OUTPUT_MODE` (for Raspberry Pi embed). `images: { unoptimized: true }`. |
| Auth: NextAuth v4 JWT strategy | `lib/auth-options.ts` | Credentials only. `middleware.ts` protects `/dashboard`, `/practice`, `/results`, `/students`. |
| ORM: Prisma 6 | `prisma/schema.prisma` | 4 models: `User`, `PracticeSession`, `Question`, `StudentAnswer`. Supabase PostgreSQL with pgbouncer required. |
| AI: Abacus.AI (Abacus.AI) | `app/api/generate-question/route.ts:72`, `app/api/evaluate-answer/route.ts:48` | Model: `gpt-5.4-mini`. Calls `https://apps.abacus.ai/v1/chat/completions` via `fetch()` with SSE streaming. |
| UI: shadcn/ui | `components/ui/` (~50 components) | Config at `components.json`. prakis: `@/components/ui`, utils at `@/lib/utils`. |
| Theme: CSS variables (darkMode: "class") | `tailwind.config.ts` | Fonts: DM Sans (body), Plus Jakarta Sans (display), JetBrains Mono (mono). |

## API routes (short)

| Route | Purpose |
|-------|---------|
| `POST /api/generate-question` | AI generates math question (SSE, returns JSON). Shape/geometry topics get SVG inline. |
| `POST /api/evaluate-answer` | AI evaluates student answer (SSE, returns JSON). |
| `POST /api/questions` | Persist question to DB. |
| `POST /api/answers` | Persist student answer to DB. |
| `PATCH /api/sessions/:id` | Mark session complete, save score. |
| `POST /api/signup` | User registration. |
| `POST /api/auth/[...nextauth]` | NextAuth authentication. |

## LLM in practice
- Client `app/practice/_components/practice-session.tsx` calls:
  - `streamResponse('/api/generate-question', …)` — line 140
  - `streamResponse('/api/evaluate-answer', …)` — line 186
- The `streamResponse()` client helper (line 86-127) parses SSE from Next.js routes.
- Both server routes (route.ts line 72, evaluate line 48) `fetch()` to Abacus.AI.
- `app/layout.tsx:34` loads an Abacus.AI script tag (`appllm-lib.js`) but it appears **unused** — check before relying on it.
- `generate-question` requests `response_format: { type: 'json_object' }`, `stream: true`. For geometry/shape topics it adds a `figureCode` SVG field (SVG `viewBox="0 0 400 400"`).

## Incremental Prisma binary
Schema sets `binaryTargets = ["native"]`. Prisma binary is baked per-host. Reproduce in same OS/arch (esp. Raspberry Pi).

## Authentication
- Follows `app/page.tsx`: unauthenticated users → `/login`. Authenticated → `/dashboard`.
- `middleware.ts` guards pages.
- Session carries `role` and `yearLevel` on JWT.

## Seed accounts
| Role | Email | Password |
|------|-------|----------|
| Teacher | john@doe.com | johndoe123 |
| Student | student@demo.com | student123 |
| Demo Teacher | teacher@demo.com | teacher123 |

## Mac + Linux conventions
- No lint script in `package.json` beyond `next lint`. No test framework configured.
- Styling uses Tailwind with CSS var tokens (neutrals). shadcn/ui components.
