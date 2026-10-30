# EOTC Senbet Tmhrtbet Learning Platform — Codebase Analysis

Offline-first learning platform for Ethiopian Orthodox Sunday Schools (grades → subjects → chapters, PDF textbooks, quizzes, teacher contributions, notifications, support tickets). Bilingual (English/Amharic).

## 1. Monorepo layout (pnpm workspaces)

| Path | Package | Purpose |
|---|---|---|
| `apps/api` | `@eotc/api` | Express 4 + Prisma 6 + PostgreSQL 16 REST API |
| `apps/web` | `@eotc/web` | Next.js 15 (App Router) + React 19 + Tailwind PWA, IndexedDB via `idb`, service worker |
| `apps/mobile` | `@eotc/mobile` | Expo 52 / React Native 0.76, SQLite + file downloads |
| `packages/shared` | `@eotc/shared` | Zod schemas, TS types, API contracts shared by all apps |
| `nginx/`, `docker-compose*.yml` | — | Reverse proxy + prod containers (dev compose = Postgres only) |
| `docs/` | — | Deployment guide, security review, user workflows, implementation status, PDF manual |
| `scripts/` | — | DB backup/restore (PowerShell), smoke test, PWA icon + manual generators |

Note: `docs/implementation-status.md` mentions `apps/admin`; it does not exist — the admin portal lives inside `apps/web/src/app/admin`.

## 2. Data model (Prisma, `apps/api/prisma/schema.prisma`)

- **Identity**: `User` (roles `ADMIN | TEACHER | STUDENT`, optional parish, profile fields), `RefreshSession` (hashed token, revocation), `AuditLog`.
- **Curriculum**: `Grade` → `Subject` (holds master textbook file metadata) → `Chapter` (`isPublished`, `version`) → `TextbookDocument` (start/end page range of the subject PDF), `Quiz` → `QuizQuestion` → `QuestionChoice`, `ReferenceLink`, `PracticeQuestion` → `PracticeChoice`, `LearningPackage` (versioned manifest JSON + SHA-256 + size).
- **Learner data**: `QuizAttempt` (unique `clientAttemptUuid` for idempotent sync) → `QuizAttemptAnswer`, `StudentProgress` (last page, completion), `StudentGradeEnrollment`.
- **Community/ops**: `Parish` (verified/suggested), `Notification` + `NotificationRecipient` (broadcast / by grade / by role), `SupportTicket` + `TicketMessage`.
- **Moderation**: `ReferenceLink` and `PracticeQuestion` carry `ModerationStatus` (teacher submissions default to `PENDING_REVIEW`).

## 3. API (`apps/api/src`, mounted under `/api`)

Layering: `routes/` → `controllers/` (Zod-validate, shape `{success,data,meta}` responses) → `services/` (Prisma logic). Middleware: helmet, CORS allow-list, 2 MB body limit, request logger, general + per-route rate limiters (login/register/sync), central `AppError` handler.

Auth: bcryptjs, JWT access (15m) + refresh (7d) with rotation/reuse detection, `authenticate` re-checks user existence/active on each request, `requireRole`.

| Area | Prefix | Access |
|---|---|---|
| Health | `/health` | public |
| Auth | `/auth` register/login/refresh/logout/me/profile | public / authed |
| Parishes | `/parishes` | list/get/create public; verify/update/delete admin |
| Curriculum (read) | `/curriculum/*`, `/chapters/:id/pdf` | public reads |
| Admin curriculum | `/admin/curriculum/*` (CRUD grades/subjects/chapters, upload-pdf via multer, textbook range, quizzes, references, publish/unpublish) | ADMIN |
| Admin users/students/notifications/support/moderation | `/admin/*` | ADMIN |
| Teacher | `/teacher/*` (parish overview, students, submit references/practice questions) | TEACHER, ADMIN |
| Student | `/student/enrollments`, `/student/curriculum`, `/student/packages/:chapterId`, `/student/sync/{batch,attempts,pull}` | authed |
| Notifications / support | `/notifications`, `/support/tickets` | authed |

Sync design: client-generated `clientAttemptUuid` → server dedupes (`DUPLICATE`), re-validates scores server-side, progress is last-write-wins by `lastStudiedAt`.

## 4. Clients

**Web** (`apps/web/src`): pages for login, student home (curriculum), chapter reader (`PdfViewer`, pdf.js worker), practice quiz, download manager, profile, support, FAQ/about, teacher dashboard (1.4k lines), admin portal (dashboard, curriculum studio, chapter editor, users, students, sunday-schools, moderation, notifications, support, AI curriculum studio). `lib/api.ts` (1.4k lines) is the single API client; `offline-db.ts` (stores: packages, quiz_attempts outbox, student_progress, auth_cache), `download-manager.ts` (verify size/checksum before marking complete), `sync-manager.ts`, language + theme contexts. Recent work: responsive pagination, mobile off-canvas nav drawers, mobile grade selector.

**Mobile** (`apps/mobile`): mirrors web — SQLite schema, download manager, sync manager, quiz player, PDF reader, Login/Curriculum/Chapter/DownloadManager screens.

## 5. Tests & tooling

Vitest in api (auth, curriculum, e2e, health, pdf-isolation, sync, senior QA e2e), web (admin portal, offline storage, sync) and mobile (offline, sync with mocked fs/sqlite). Root scripts: `build`, `lint`, `typecheck`, `test`, `db:migrate|seed|studio`, `dev:api`, `dev:web`. Single migration `20261021072337_init`.

## 6. Findings / risks (verify before acting)

1. **Critical — privilege escalation at signup.** `RegisterRequestSchema` (`packages/shared/src/schemas/index.ts:266`) accepts `role` (default `STUDENT`) and `AuthService.register` uses `data.role || 'STUDENT'` (`auth.service.ts:102`). Public `POST /auth/register` therefore lets anyone self-register as `ADMIN`. Fix: drop `role` from the public schema (or only allow STUDENT); admin-created users go through `/admin/users`.
2. **Public parish creation.** `POST /parishes` has no auth/role guard (only verify/update/delete are admin) — spam/abuse vector; at minimum rate-limit or require auth and force `isVerified=false`.
3. **Port mismatch.** `nginx.conf` upstream is `api:3000`; prod compose sets `PORT: 3000` (ok), but `env.ts` default and `.env.example` use 4000 — fine for dev, confirm web `NEXT_PUBLIC_API_URL` matches per environment.
4. **Storage inconsistency.** Cloudinary env vars are validated/documented, but uploads are served from local `apps/api/uploads` via multer + `express.static`. Uploaded PDFs (and `backups/*.sql`) are committed to git — likely should be git-ignored and moved to object storage/volume.
5. **Open `/uploads` CORS** (`*`) and `frameguard` disabled; PDF endpoints under `/curriculum` are public — confirm unpublished chapter PDFs aren't reachable.
6. **Default secrets/credentials** in `env.ts` (admin password, Cloudinary dev keys) and a weak-ish dev JWT secret example; ensure production overrides and fail-fast on defaults.
7. **Large files**: `teacher/page.tsx` (1410 lines), `lib/api.ts` (1422 lines) — candidates for splitting.
8. Docs drift: status doc references nonexistent `apps/admin`; `scratch/` dir is untracked scratch.
9. Working tree: `apps/web/src/components/Navbar.tsx` has uncommitted changes (branch `master`, main branch is `main`).

## 7. Suggested next steps

1. Fix finding #1 (+ add a regression test in `apps/api/tests/auth.test.ts`).
2. Guard/limit `POST /parishes`.
3. Untrack uploads/backups, decide on local vs Cloudinary storage.
4. Refactor oversized web files; refresh docs.
