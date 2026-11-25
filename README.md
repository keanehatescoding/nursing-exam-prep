# Nursing & clinical licensure exam-prep app

- **Concept:** A mobile/web question bank mapped to Kenya's nursing/midwifery and clinical-officer licensure exams, with explanations, progress tracking, and timed mock exams.
- **Origin:** Global — UWorld, Picmonic and ATI dominate this category for US nursing students; passNMC does the same for Nigeria's nursing council exam specifically.
- **Examples:** passNMC (exam-mapped question bank for Nigeria's NMCN blueprint) is the closest direct comparator for an African regulatory-exam context.
- **Evidence of demand:** Nursing exam-prep is a mature, monetizable ed-tech category wherever a national licensure exam exists; Kenya has exactly that structure via the Nursing Council of Kenya (NCK).
- **Kenya landscape:** KeNuM (the official NCK app) handles licensing admin — renewals, CPD tracking, exam registration — not exam-content prep. Search results otherwise turned up only static PDF past-paper sites, no modern Kenya-specific question-bank product.
- **Opportunity:** Large, renewing annual cohorts across many KMTC campuses nationwide, all studying for the same standardized exam, with no dedicated prep app.
- **Target customers:** KMTC and university nursing/midwifery students (and could extend to clinical officers, pharmacy techs).
- **Revenue model:** Freemium with a paid monthly/annual tier for full question-bank access; a "final push" bundle priced around exam dates.
- **Difficulty:** Medium — the app itself is simple; the real work is sourcing/verifying thousands of accurate, NCK-syllabus-mapped questions with a practicing nurse educator.
- **Scalability:** High — the same product structure re-maps to Uganda, Tanzania, and other East African nursing councils with new content sets.
- **Risks:** Content accuracy is a patient-safety issue, not just a UX one; needs a credible clinical reviewer; low individual willingness-to-pay means volume matters.
- **MVP:** \~500 questions covering one subject area (e.g., Maternal & Child Health), reviewed by a nurse educator, distributed free/freemium through one KMTC campus's student WhatsApp groups.

## Deep dive

Customers are KMTC and university nursing/midwifery students. Price a modest monthly subscription (e.g., KSh 200–500/month) with a meaningfully free tier, since students are price-sensitive but exam pressure drives conversion near exam dates. MVP: 500 well-written, NCK-syllabus-mapped questions in one subject area, reviewed by a practicing nurse educator (a paid collaborator, not a co-founder, is enough to start). First steps: partner with one KMTC campus's student association to distribute a free beta and gather usage data before charging anyone.

---

Source: `PROJECTS.md` (Online Business Models: Proven Abroad, Underdeveloped in Kenya).


---

## Stack & dev

Scaffolded as a Next.js 16 + Drizzle (Postgres) app, matching the stack used in `odpc-compliance-saas`. The schema in `src/db/schema.ts` is the current source of truth for the data model; UI, auth and payment integrations are not yet wired up.

```
npm install
# point .env at a Postgres instance, see .env.example
npm run db:generate   # drizzle-kit: emit SQL migrations from the schema
npm run db:migrate    # apply them (uses scripts/migrate.ts, applying migrations from ./drizzle)
npm run db:seed      # idempotent seed for a starter council/subject/topic and sample questions
npm run dev           # Next.js dev server on :3000
```

If you applied an earlier local baseline migration before the checked-in
`drizzle/` journal existed, Drizzle may treat `0000_flippant_black_knight` as
pending and fail on `CREATE TYPE` against that local database. This scaffold
has no shared or production database yet, so the recovery is to drop and
recreate your local database, then run `npm run db:migrate` and
`npm run db:seed`. The seed script is idempotent. For any shared database
with real data, reconcile the migration ledger instead of resetting it.

What is here:
- `src/db/schema.ts` — Drizzle Postgres schema specific to this domain
- `src/db/index.ts` — pooled `pg` + Drizzle client
- `src/app/layout.tsx` + `src/app/page.tsx` — minimal placeholder shell so `next dev`/`next build` run; no question-bank UI yet
- `scripts/migrate.ts` — applies Drizzle migrations from `./drizzle`
- `scripts/seed.ts` — idempotent seed for a starter council/subject/topic and sample questions (requires `DATABASE_URL` and applied migrations)
- `drizzle.config.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- `src/app/globals.css`, `.gitignore`, `.env.example`

What is still a stub:
- Auth (sessions, password reset, email verify) — copy and adapt the `lib/session.ts`, `lib/password.ts`, `lib/email-verification.ts` set from `odpc-compliance-saas`.
- Payments (M-Pesa Daraja / Paystack / card) — stack-specific, add per project.

## Deploying

Railway deploys this service from `master`. `.railway/railway.ts` is the source
of truth for the environment: apply it with `railway config apply`. It builds
with Railpack, runs `npm run db:migrate` before each deploy, and checks
`/api/health` (which queries Postgres, not just the app process) before
routing traffic to the new version.

Set secrets on Railway itself, never in the repository:

```
railway variables --set APP_URL=https://<your-public-host>
```

`DATABASE_URL` is injected from the Postgres service declared in `railway.ts`.

To run the same shape locally: `docker compose up -d db`, then put
`DATABASE_URL=postgres://app:app@localhost:5432/app` in `.env`, run
`npm run db:migrate` and `npm run dev`. `docker compose down` keeps the data
volume; add `-v` to remove it.

For a self-hosted container deployment, `docker build -t nursing-exam-prep .` produces a
production image that applies migrations and then starts the app. Its
`HEALTHCHECK` uses the same `/api/health` endpoint.
