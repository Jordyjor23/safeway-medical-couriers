# Production deployment — portal.safewaycouriers.com

Local development stays at `http://localhost:3000`. Production is a Vercel deployment of this same Next.js app, reached at `https://portal.safewaycouriers.com`. Port 3000 is not exposed to the internet.

The public marketing site remains `https://www.safewaycouriers.com`. It is not rebuilt. Portal paths on www (`/login`, `/dashboard`, …) redirect to the portal hostname so authentication cookies stay on one domain.

## What changed

- App origin, auth callbacks, and activation emails now come from environment variables (`BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`), not a hard-coded localhost URL. Localhost is only a development fallback when those variables are unset and the app is not on Vercel.
- Production uses HTTPS-only cookies, HSTS, CSP, and security headers. `X-Powered-By` is disabled.
- CORS for `/api/*` allows only the configured origins (portal, www, optional extras).
- Generic error pages hide stack traces.
- Unauthenticated users hitting the portal hostname `/` go to `/login`. Signed-in users go to `/portal`.
- Existing Better Auth + Prisma RBAC is unchanged: Owner, Admin, Dispatcher, Driver, Employee, Customer, and the other staff roles. Server-side `requirePermission` / `requirePortal` still enforce access.
- Removed a sync helper (`isKnownRole`) from a `"use server"` file so the Vercel production build can complete. That file may only export async Server Actions.

## Files changed

- `lib/app-url.ts`, `lib/cors.ts`, `lib/auth.ts`, `lib/activation.ts`
- `proxy.ts`, `next.config.ts`, `.env.example`
- `app/error.tsx`, `app/global-error.tsx`, `app/robots.ts`
- `app/api/portal/me/route.ts`
- `app/(portal)/dashboard/users/actions.ts`
- `tests/app-url.test.ts`
- `docs/PRODUCTION-DEPLOYMENT.md` (this file)

## Environment variables to set in Vercel

Set these on the **Production** environment. Preview must use a **separate** Neon database or branch — never Production `DATABASE_URL`. See `docs/PREVIEW-DATABASE.md`.

| Variable | Production value |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** URL for app runtime (also the migrate fallback). **Not** localhost. Must be available at **build time**. Must start with `postgresql://` or `postgres://` (no wrapping quotes). |
| `DIRECT_URL` | Optional unpooled URL for `prisma migrate deploy`. On Neon, set this to the non-pooling string, or omit it and use `DATABASE_URL_UNPOOLED`. |
| `DATABASE_URL_UNPOOLED` | Provided by the Vercel Neon integration. Used for migrate when `DIRECT_URL` is unset. App runtime still uses `DATABASE_URL`. |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://portal.safewaycouriers.com` |
| `NEXT_PUBLIC_APP_URL` | `https://portal.safewaycouriers.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://portal.safewaycouriers.com` |
| `PORTAL_HOST` | `portal.safewaycouriers.com` |
| `OWNER_SETUP_SECRET` | Long random string (empty-install `/setup` only; remove after Owner MFA) |
| `DATA_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | `Safeway Couriers <noreply@safewaycouriers.com>` |
| `CRON_SECRET` | **Required in Production.** Long random string. `GET /api/cron/alerts` rejects requests that are not `Authorization: Bearer $CRON_SECRET`. |
| `AUTH_TRUSTED_ORIGINS` | Optional, comma-separated extra origins |

Never commit real values. Local `.env.local` keeps `http://localhost:3000` and the local `DATABASE_URL`.

## Services / accounts required

1. **Vercel** project (this repo already deploys the Next.js app).
2. **Hosted PostgreSQL** (Vercel Postgres or Neon recommended).
3. **Resend** (activation and password-reset email). Verify `safewaycouriers.com`.
4. **Vercel Blob** if you store private documents.
5. **DNS** at your domain registrar for `portal.safewaycouriers.com`.

## Exact Vercel steps

1. Open the existing Safeway Couriers Vercel project (same git repo / `main`).
2. **Settings → Environment Variables** and add the production values above. Mark `NEXT_PUBLIC_*` for Production (they are inlined at build time).
3. **Settings → Domains** → Add `portal.safewaycouriers.com`.
4. Keep `www.safewaycouriers.com` and `safewaycouriers.com` as they are (apex already redirects to www).
5. Framework preset: **Next.js**. Build command: `npm run build` → `node scripts/vercel-build.mjs`. That always runs `prisma generate` and `next build`. `prisma migrate deploy` and `ensure-rbac` run only when `VERCEL_ENV=production` (Production deploys) or `RUN_MIGRATE_ON_BUILD=1` (isolated Preview DB opt-in). Output: default. Install: `npm install`.
6. Deploy Production from `main` (push or Deploy). `DATABASE_URL` must be available at **build time**.
7. Do **not** run `prisma db seed` on production if it already has live data. Seed is not part of the deploy script.

## Exact DNS records

At the DNS host for `safewaycouriers.com`:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `portal` | `cname.vercel-dns.com` (or the target Vercel shows when you add the domain) |

Use the exact CNAME/A records Vercel displays for `portal.safewaycouriers.com`. Do not point the portal hostname at `localhost` or at a forwarded port 3000.

Wait until the domain shows **Valid** in Vercel. HTTPS certificates are issued by Vercel automatically.

## Database migration steps

`npm run build` on Vercel Production (`VERCEL_ENV=production`) runs:

```bash
npx prisma generate
npx prisma migrate deploy   # Production only, or RUN_MIGRATE_ON_BUILD=1
npx tsx scripts/ensure-rbac.ts
npx next build
```

Preview/Development builds still run `prisma generate` and `next build`, but they **skip** `migrate deploy` and `ensure-rbac` unless `RUN_MIGRATE_ON_BUILD=1`. On Vercel Hobby, that gate is what stops Preview from mutating Production when Preview has no separate database. Details: `docs/PREVIEW-DATABASE.md`.

`migrate deploy` applies pending folders under `prisma/migrations/` only. It does not reset the database, drop existing tables of applied migrations, or seed.

- `DATABASE_URL` must be set for Production **and available at build time**. App runtime uses this pooled Neon URL.
- Later deploys apply only new migration folders.
- **Do not** run `prisma migrate reset`, `prisma migrate dev`, `prisma db push --force-reset`, or `prisma db seed` against production if it already has the Owner account and business data.

The checked-in migrations contain no `DROP TABLE`, `TRUNCATE`, or `DROP DATABASE`. The RBAC upgrade adds columns/tables and converts the role key to text; it does not delete users, employees, or operational history.

If `migrate deploy` fails through a connection pooler, set `DIRECT_URL` to the unpooled connection string, **or** rely on Neon’s `DATABASE_URL_UNPOOLED` from the Vercel integration. The deploy script resolves migrate URLs as `DIRECT_URL` → `DATABASE_URL_UNPOOLED` → `DATABASE_URL`. It never prints the URL value. The app continues to use `DATABASE_URL` at runtime. Never commit real credentials.

## Authentication callback URLs

There is no separate OAuth provider. Better Auth email/password + username + TOTP uses this origin:

- App / cookie origin: `https://portal.safewaycouriers.com`
- Auth API: `https://portal.safewaycouriers.com/api/auth/*`
- Login: `https://portal.safewaycouriers.com/login`
- Activation: `https://portal.safewaycouriers.com/activate?token=…`
- Password reset: `https://portal.safewaycouriers.com/reset-password`

Set `BETTER_AUTH_URL` to `https://portal.safewaycouriers.com` so reset and activation emails never contain localhost.

If you later add Google/Microsoft OAuth, register the callback:

`https://portal.safewaycouriers.com/api/auth/callback/<provider>`

## What you must do manually before the portal is public

1. Add the Vercel env vars (especially `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `RESEND_API_KEY`, `CRON_SECRET`).
2. Add the `portal.safewaycouriers.com` domain in Vercel and create the DNS CNAME.
3. Point Production `DATABASE_URL` at hosted Postgres (build-time). Migrations run automatically on **Production** deploys (`VERCEL_ENV=production`). Preview must not share that URL.
4. Confirm Resend can send from `EMAIL_FROM`.
5. Sign in as Owner at `https://portal.safewaycouriers.com/login`. If no Owner exists, use `/setup` with `OWNER_SETUP_SECRET` once, then enable MFA. `/setup` cannot reset an existing Owner password.
6. Enable Owner MFA at `/dashboard/security`. After that, remove `OWNER_SETUP_SECRET` from Production.
7. Optional: Vercel Blob token for document uploads.

Until those steps are done, production login and email will not work even though the code is deployment-ready.

## Local development

```bash
cp .env.example .env.local
# fill local secrets; keep URLs on http://localhost:3000
npm run dev
```

Open `http://localhost:3000`. Do not use production `BETTER_AUTH_URL` in `.env.local`.

## Secret rotation (ops — do not commit values)

This app does not rotate live Vercel secrets. In the Vercel project (Production first, then Preview if it shares the secret):

1. Generate a new signing secret: `openssl rand -base64 32`
2. Set `BETTER_AUTH_SECRET` for Production. Redeploy so runtime picks it up.
3. Every existing session, bearer token, and password-reset token signed with the old secret becomes invalid. Owners and staff must sign in again.
4. Confirm Production runtime is not using the build placeholder `unconfigured-local-secret-not-for-production-use` and that the value is at least 32 characters.
5. After the first Owner exists and MFA is enabled, delete `OWNER_SETUP_SECRET` from Production. Keep it only in a password manager if you still need a brand-new empty-environment bootstrap.

Preview should use its own `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` (the preview origin). Do not reuse the Production secret on Preview.
