# Production deployment — portal.safewaycouriers.com

Local development stays at `http://localhost:3000`. Production is a Vercel deployment of this same Next.js app, reached at `https://portal.safewaycouriers.com`. Port 3000 is not exposed to the internet.

The public marketing site remains `https://www.safewaycouriers.com`. It is not rebuilt. Portal paths on www (`/login`, `/dashboard`, …) redirect to the portal hostname so authentication cookies stay on one domain.

## What changed

- App origin, auth callbacks, and activation emails now come from environment variables (`BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`), not a hard-coded localhost URL. Localhost is only a development fallback when those variables are unset and the app is not on Vercel.
- Production uses HTTPS-only cookies, HSTS, and security headers. `X-Powered-By` is disabled.
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

Set these on the **Production** environment (and Preview if you use preview logins):

| Variable | Production value |
| --- | --- |
| `DATABASE_URL` | Hosted Postgres connection string (Neon / Vercel Postgres / RDS). **Not** localhost. Must be available at **build time**. |
| `DIRECT_URL` | Optional non-pooling URL for `prisma migrate deploy` when `DATABASE_URL` is pooled. |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://portal.safewaycouriers.com` |
| `NEXT_PUBLIC_APP_URL` | `https://portal.safewaycouriers.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://portal.safewaycouriers.com` |
| `PORTAL_HOST` | `portal.safewaycouriers.com` |
| `OWNER_SETUP_SECRET` | Long random string (only if you still need `/setup`) |
| `DATA_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | `Safeway Couriers <noreply@safewaycouriers.com>` |
| `CRON_SECRET` | Long random string |
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
5. Framework preset: **Next.js**. Build command: `npm run build` → `node scripts/vercel-build.mjs`. That runs `prisma generate`, then `prisma migrate deploy`, then `next build`. Output: default. Install: `npm install`.
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

`npm run build` on Vercel runs:

```bash
npx prisma generate
npx prisma migrate deploy
npx next build
```

`migrate deploy` applies pending folders under `prisma/migrations/` only. It does not reset the database, drop existing tables of applied migrations, or seed.

- `DATABASE_URL` (and optional `DIRECT_URL` for Neon/Vercel pooled connections) must be set for Production **and available at build time**.
- Later deploys apply only new migration folders.
- **Do not** run `prisma migrate reset`, `prisma migrate dev`, `prisma db push --force-reset`, or `prisma db seed` against production if it already has the Owner account and business data.

The checked-in migrations contain no `DROP TABLE`, `TRUNCATE`, or `DROP DATABASE`. The RBAC upgrade adds columns/tables and converts the role key to text; it does not delete users, employees, or operational history.

If `migrate deploy` fails through a connection pooler, set `DIRECT_URL` to the non-pooling connection string. The deploy script uses `DIRECT_URL` for migrations when it is present, while the app continues to use `DATABASE_URL` at runtime.

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

1. Add the Vercel env vars (especially `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `RESEND_API_KEY`).
2. Add the `portal.safewaycouriers.com` domain in Vercel and create the DNS CNAME.
3. Point `DATABASE_URL` at hosted Postgres (build-time). Migrations run automatically on deploy.
4. Confirm Resend can send from `EMAIL_FROM`.
5. Sign in as Owner at `https://portal.safewaycouriers.com/login`. If no Owner exists, use `/setup` with `OWNER_SETUP_SECRET` once.
6. Change the Owner password if it is still a temporary local value.
7. Optional: Vercel Blob token for document uploads.

Until those steps are done, production login and email will not work even though the code is deployment-ready.

## Local development

```bash
cp .env.example .env.local
# fill local secrets; keep URLs on http://localhost:3000
npm run dev
```

Open `http://localhost:3000`. Do not use production `BETTER_AUTH_URL` in `.env.local`.
