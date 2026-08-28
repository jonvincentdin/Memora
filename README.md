# Memora

A full-stack study platform that turns your notes into structured reviewers, quizzes, and exams — built with Next.js 15, TypeScript, Prisma, and NextAuth.

Memora can generate ready-to-use prompts for a manual copy/paste workflow, or users can connect their own OpenAI, Anthropic, or Gemini API key for one-click generation. Provider keys are encrypted at rest and AI output is validated before it is saved.

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS with a custom design system (`tailwind.config.ts`)
- **Database:** PostgreSQL via Prisma ORM (`prisma/schema.prisma`)
- **Auth:** NextAuth.js credentials plus per-user Google Drive and Notion OAuth connections
- **Content:** Notes and reviewers are Markdown, **gzip-compressed at rest** (see Storage below), rendered with `react-markdown` + `remark-gfm`
- **Validation:** Zod schemas shared between client and server (`lib/validation/`)
- **PDF export:** client-side, print-first rendering through `jsPDF` — no server round trip, works for guest mode too

## Getting started

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate dev    # creates tables from prisma/schema.prisma
npm run dev
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

Never commit `.env`. If a secret is exposed, removing the file is not enough: rotate the credential and remove it from Git history.

**Do you need to run `prisma migrate dev` every time?** No — only when `prisma/schema.prisma` itself changes (adding/renaming a field, changing a type, etc.). Normal day-to-day use (creating notes, editing reviewers, taking quizzes) is just regular database reads/writes through Prisma Client and never touches migrations. This particular version of the schema *did* change (Note/Reviewer content moved from `String` to compressed `Bytes`), so if you're upgrading from an earlier copy of this project, run the migration once to apply it — after that you're done until the schema changes again.

`npm install` runs `prisma generate` automatically (via `postinstall`). If you're behind a restrictive network/proxy and it fails to fetch Prisma's query-engine binary, run `npx prisma generate` again once you have access to `binaries.prisma.sh`.

Vercel runs `prisma migrate deploy` for production deployments only. Preview builds skip database migrations so they do not require or modify the production database.

### Production latency

Server functions and PostgreSQL should run in the same geographic region. This repository targets Vercel's Singapore region (`sin1`) because the production Neon database is in AWS Asia Pacific (Singapore). If the database is moved, update `regions` in `vercel.json` to the closest supported Vercel region; otherwise every authenticated page and login pays for a long cross-region database round trip.

Set `DATABASE_URL` to the provider's pooled PostgreSQL connection string in Vercel Production, Preview, and Development as appropriate. Store it as a Secret and paste the raw URL without surrounding quotes. `AUTH_SECRET` must also be configured as a Secret. Redeploy after changing environment variables.

## Project structure

```
app/
  (app)/            # authenticated routes, wrapped by a shared sidebar/topbar layout
    dashboard/  notes/  reviewers/  quizzes/  study/  shared/  settings/
  guest/            # unauthenticated "quick mode" — no login, nothing saved
  api/               # route handlers — every one re-checks auth + ownership/sharing
    guest/           # public, stateless endpoints (prompt generation, file extraction)
  login/ register/   # public auth pages
  page.tsx           # marketing landing page
components/
  markdown/          shared MarkdownEditor (toolbar + preview + formatting guide) and MarkdownRenderer
  guest/             guest-mode reviewer/quiz flows
  notes/ reviewers/ quizzes/ study/ sharing/ ui/ layout/
lib/
  auth/              NextAuth config + server session helpers
  db/                Prisma client singleton
  notes-repo.ts / reviewers-repo.ts   the ONLY places allowed to touch the compressed content column — see Storage below
  compression.ts     gzip helpers used by the two repos above
  permissions/       central ownership/share access-control checks
  validation/        Zod schemas (auth, notes, reviewers, quizzes)
  imports/           TXT/MD/PDF/JSON parsing and user-scoped Google Docs/Notion imports
  integrations/      token encryption, OAuth state signing, and connection repository
  exports/           JSON export builders
  markdown-frontmatter.ts   lossless title/description round-trip for exported .md files
  prompts/           builds the "prepare notes" and "generate quiz" AI prompts
  pdf-export.ts      client-side Markdown and print-first quiz/exam PDF rendering
  quiz-grading.ts     shared grading logic (used by both saved attempts and guest mode)
  rate-limit.ts / guest-rate-limit.ts   durable database-backed throttling (see Security below)
prisma/schema.prisma
```

## Storage: compressed content

`Note.content` and `Reviewer.content` — the two fields that can realistically grow large (pasted or AI-generated study material) — are stored as gzip-compressed `Bytes` in Postgres rather than plain `text`. Plain-language Markdown routinely compresses 60-80%, which matters once you have many users each with their own note/reviewer library.

This is deliberately **not** implicit ORM magic: `lib/notes-repo.ts` and `lib/reviewers-repo.ts` are the only files that call `prisma.note`/`prisma.reviewer` when `content` is involved. Every API route and page goes through `createNote`/`updateNote`/`findNoteById`/`findNotesByOwner` (and the Reviewer equivalents), which handle compress-on-write and decompress-on-read and hand back a plain `string` — nothing else in the app needs to know the column is compressed. Reads that only need metadata (titles, dates, for list views) use a `select` that excludes `content` entirely and skip Prisma directly, since there's nothing to decompress.

## How the AI-assisted workflow works

1. **Import** — upload a `.md`/`.txt`/`.pdf` file (or a Memora `.json` export, see Round-trip below), paste content, or connect your own Google Drive/Notion workspace and choose a document.
2. **Generate a prompt** — select notes, pick a processing style, and Memora builds a prompt asking for a clean **Markdown** document back (see `lib/prompts/note-prompt.ts` and `lib/prompts/quiz-prompt.ts`). Reviewers deliberately are *not* a rigid JSON schema — Markdown is far more reliable for a model to produce correctly, and Memora renders it with full typography.
3. **Generate or copy** — use an encrypted, user-owned OpenAI/Anthropic/Gemini key for direct generation, or copy the prompt into any AI assistant yourself.
4. **Import the result** — paste the response back into Memora. Reviewer content just needs to be non-trivial Markdown; quiz content is validated against a Zod schema (`lib/validation/quiz.ts`) that's deliberately lenient about common AI quirks — it strips ```` ```json ```` code fences, accepts either casing for enum values, tolerates a missing/duplicate question `id` by reassigning one, and reports the rest as clear field-level errors instead of a wall of raw Zod output.
5. **Study** — turn the result into flashcards, quizzes, and exams, and track attempts over time.

## Round-trip fidelity (export → re-import)

Exported `.md` files carry a small frontmatter header (`--- title: ... ---`) so re-importing recovers the exact original title/description instead of guessing from the filename. Exported `.json` files (`memora-note-export` / `memora-reviewer-export`) can be re-imported directly through the same "Upload File" flow — anything else named `.json` is rejected with a clear message rather than silently imported. JSON exports are compact (no pretty-print whitespace) to keep file size down.

## PDF export

Quiz and exam PDFs use an explicit white-page, dark-text template that is independent of the app theme. Every document contains a Memora/title/metadata header, numbered questions and response options, followed by an answer key with the correct answer and detailed explanation for every question. Drawing text directly with `jsPDF` avoids browser CSS and canvas visibility bugs that can produce blank exports. Reviewer/Markdown exports use a lightweight structural renderer for headings, paragraphs, lists, callouts, and tables.

## Guest / quick mode (`/guest`)

No account, nothing saved. Guests can create reviewers, flashcards, quizzes, and exams; generate an AI prompt or import quiz JSON directly; and choose Review mode (instant per-question feedback) or Exam mode (feedback after submission). Reviewer output automatically exposes flashcards. Everything stays client-side except the stateless prompt-generation and file-text-extraction endpoints under `/api/guest/*`.

## Data model

See `prisma/schema.prisma` for the full schema. Highlights:

- `User` / `UserSettings` — auth + per-user preferences.
- `IntegrationConnection` — encrypted, user-owned Google/Notion OAuth tokens and non-secret account metadata.
- `Note` / `Reviewer` — both store `content` as compressed Markdown (see Storage above). `ReviewerNote` is an explicit join table recording which notes a reviewer was built from.
- `Quiz` / `QuizAttempt` — a quiz's questions and configuration (JSON, since grading needs structured data), plus every graded attempt a user makes.
- `ResourceShare` — a polymorphic-by-convention sharing table (`resourceType` + `resourceId`) granting `VIEW` or `EDIT` access to another user. Prisma has no native polymorphic relations, so referential integrity for `resourceId` is enforced in `lib/permissions`, not a DB foreign key.

Every API route re-derives access via `lib/permissions/index.ts::getAccessLevel` — ownership and shares are never trusted from the client.

## Security notes

- Passwords hashed with bcrypt (cost factor 12).
- Login errors are deliberately generic ("Invalid email or password") and always run `bcrypt.compare` — even against a dummy hash when the email doesn't exist — so response timing doesn't leak which emails are registered.
- Database-backed rate limiting protects login (per email), registration (per IP), guest endpoints, and public feedback consistently across serverless instances and cold starts.
- Guest endpoints (`/api/guest/*`) also have hard content-size caps because they are unauthenticated.
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are set globally in `next.config.mjs`.
- Markdown is rendered via `react-markdown` **without** the `rehype-raw` plugin, so raw HTML in note/reviewer content (whether typed by a user or returned by an AI) is displayed as literal text rather than executed — this is what keeps rendering safe without a separate sanitization pass.
- File uploads are capped by size, restricted to `.md`/`.txt`/`.pdf`/Memora's own `.json` exports by extension, and PDFs are additionally verified by magic-byte sniffing rather than trusting the extension alone.
- Google/Notion OAuth state is short-lived and HMAC-signed; provider tokens are AES-256-GCM encrypted at rest and looked up by user + provider so credentials cannot be shared across accounts.

## What's implemented vs. what's marked TODO

**Implemented:** auth, notes CRUD + local and connected-app imports, JSON/MD/PDF export, a full Markdown editor, reviewer and quiz generation, 7 question types, Review and Exam test modes, timers and auto-grading, results screens, flashcards, full guest mode, sharing, per-user Google/Notion connections, settings, global search, and compressed at-rest storage.

The study system persists editable flashcards, schedules reviews with spaced repetition, records study sessions, presents a due-card queue, and exports cards as Anki-compatible CSV. Mastery tests use prior graded attempts to prioritize questions the learner has missed most often.

## Design system

Custom palette and type system in `tailwind.config.ts` and `app/globals.css` — ink-navy primary, amber "highlighter" accent, Fraunces (display serif) + Inter (body) + IBM Plex Mono. Rendered Markdown gets its own typography pass (`.memora-markdown` in `globals.css`) so notes and reviewers look like a designed document, not a raw text dump — and PDF exports inherit the exact same styling.
