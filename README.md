# EOTC Sunday School Learning Platform

An offline-first learning platform for Ethiopian Orthodox Tewahedo Church Sunday Schools (ሰንበት ትምህርት ቤት). Students download textbooks, take quizzes and practice questions without internet, then sync their progress. Teachers contribute material and administrators review it.

- **Web app (PWA):** Next.js 15, React 19, Tailwind CSS, IndexedDB offline storage, installable on phones
- **API:** Express, Prisma 6, PostgreSQL, JWT authentication
- **Shared package:** Zod schemas and types used by both apps
- Languages: አማርኛ and English

## Features

| Role | What they can do |
| --- | --- |
| Visitor | Browse the public landing page and the curriculum, then register free |
| Student | Enroll in grades, download chapters, read PDFs offline, take quizzes, practice questions with PDF export, track progress, manual sync |
| Teacher | See students of their Sunday School, submit practice questions in batches, upload reference documents |
| Admin | Manage curriculum, users, Sunday Schools, moderation queue, notifications, support |

## Repository layout

```
apps/
  api/        Express + Prisma backend
  web/        Next.js PWA frontend
packages/
  shared/     Shared Zod schemas and types
docs/         Extra guides (deployment, user workflows, security review)
render.yaml   Render blueprint (API + PostgreSQL)
```

## Run locally

Requirements: Node.js 20+, pnpm 9, PostgreSQL 16 (or Docker).

```bash
pnpm install

# 1. Configuration
cp .env.example .env                    # set DATABASE_URL and JWT secrets
cp apps/web/.env.example apps/web/.env.local

# 2. Database (optional: docker compose up -d postgres)
pnpm --filter @eotc/shared build
pnpm --filter @eotc/api db:generate
pnpm db:migrate
pnpm db:seed

# 3. Start both apps (two terminals)
pnpm dev:api    # http://localhost:4000/api/health
pnpm dev:web    # http://localhost:3001
```

Useful scripts: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:studio`.

## Deployment: Render (API) + Vercel (web)

Deploy the API first, because the web app needs its URL.

### 1. API and database on Render

1. In Render choose **New > Blueprint** and select this repository. `render.yaml` creates the `eotc-api` web service and the `eotc-db` PostgreSQL database. Migrations run during the build.
2. When prompted, fill in:
   - `CORS_ORIGIN`: your Vercel URL, for example `https://your-app.vercel.app` (comma separated for several, no trailing slash)
   - `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`: the first administrator
3. `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are generated automatically.
4. Once live, check `https://<your-api>.onrender.com/api/health`.
5. Seed the first admin and base data once from your computer, using the database's **External Database URL** from the Render dashboard:

   ```bash
   DATABASE_URL="<external url>" pnpm --filter @eotc/api db:seed
   ```

Manual setup instead of the blueprint: Node 20, build `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @eotc/shared build && cd apps/api && pnpm prisma generate && pnpm prisma migrate deploy && pnpm build`, start `cd apps/api && node dist/index.js`, health check `/api/health`.

> **Uploads:** PDFs uploaded through the admin panel are written to `apps/api/uploads` on the server disk. Render's free plan has an ephemeral disk, so uploads disappear on redeploy or restart. For production attach a Render persistent disk (paid) mounted at `apps/api/uploads`, or move uploads to object storage. The free plan also sleeps after inactivity, so the first request can take about 30 seconds.

### 2. Web app on Vercel

1. **Add New > Project**, import this repository.
2. Set **Root Directory** to `apps/web`. The framework is detected as Next.js, and `apps/web/vercel.json` already sets the monorepo install and build commands.
3. Add environment variables:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://<your-api>.onrender.com/api` |
   | `API_ORIGIN` | `https://<your-api>.onrender.com` |

4. Deploy, then put the final Vercel URL into the API's `CORS_ORIGIN` on Render and redeploy the API.

## Environment variables

API (`.env` at the repository root locally, Render dashboard in production):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Token signing keys, at least 16 characters, use long random values |
| `CORS_ORIGIN` | Allowed web origins, comma separated |
| `PORT`, `HOST` | Server binding (Render sets `PORT`) |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`, `INITIAL_ADMIN_NAME` | First administrator created by the seed |

Web (`apps/web/.env.local`, Vercel project settings): `NEXT_PUBLIC_API_URL`, `API_ORIGIN`.

## Security notes

- Public registration always creates a **student**. Teacher and admin accounts are assigned by an administrator.
- Change the seeded admin password after the first sign-in and never reuse the development secrets in `.env.example`.
- Uploaded files and database backups are git-ignored.

## Developed by

**Haile Michael**, software developer.
Portfolio: [haile-dev-portifoli.vercel.app](https://haile-dev-portifoli.vercel.app/)

## License

Copyright © Haile Michael. All rights reserved unless a license file states otherwise.
