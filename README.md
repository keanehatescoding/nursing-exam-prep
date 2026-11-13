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
npm run dev           # Next.js dev server on :3000
```

What is here:
- `src/db/schema.ts` — Drizzle Postgres schema specific to this domain
- `src/db/index.ts` — pooled `pg` + Drizzle client
- `drizzle.config.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- `src/app/globals.css`, `.gitignore`, `.env.example`

What is still a stub:
- `src/app/layout.tsx` + `src/app/page.tsx` — scaffold against the installed Next version (see `node_modules/next/dist/docs/`); the `odpc-compliance-saas` siblings are a working reference.
- Auth (sessions, password reset, email verify) — copy and adapt the `lib/session.ts`, `lib/password.ts`, `lib/email-verification.ts` set from `odpc-compliance-saas`.
- Payments (M-Pesa Daraja / Paystack / card) — stack-specific, add per project.
- `scripts/seed.ts` — idempotent seed for a starter council/subject/topic and sample questions (requires `DATABASE_URL` and applied migrations).
