# Preview database isolation

Vercel **Preview** and **Production** must not share a Postgres database.

Hobby / single-database constraint: if you do not have a separate Preview Neon database (or Neon branch), Preview builds **must not** run migrations or RBAC seed-style writes against Production. `scripts/vercel-build.mjs` enforces that.

## What the build does

`npm run build` → `node scripts/vercel-build.mjs`:

| Step | Preview / Development (default) | Production (`VERCEL_ENV=production`) | Opt-in (`RUN_MIGRATE_ON_BUILD=1`) |
| --- | --- | --- | --- |
| `prisma generate` | Always | Always | Always |
| `prisma migrate deploy` | **Skipped** | Runs | Runs |
| `ensure-rbac` | **Skipped** | Runs | Runs |
| `next build` | Always | Always | Always |

The skip is logged with the reason (`VERCEL_ENV=preview` / unset, and `RUN_MIGRATE_ON_BUILD` is not `1`). Connection strings are never printed.

## Required setup

1. **Production** — `DATABASE_URL` (Neon pooled) points at the Production Neon database. For migrate, set optional `DIRECT_URL` or rely on Neon’s `DATABASE_URL_UNPOOLED`. Production deploys set `VERCEL_ENV=production` automatically, so migrations still run on Production builds.
2. **Preview** — create a **separate** Neon database or Neon branch. Set Preview env vars to that URL. Never copy Production `DATABASE_URL` into Preview.
3. **Hobby without a Preview DB** — leave Preview `DATABASE_URL` unset or pointing at a throwaway DB, and **do not** set `RUN_MIGRATE_ON_BUILD`. Preview deploys will compile but will not mutate Production.

## Opt-in (Preview only, isolated DB)

Set `RUN_MIGRATE_ON_BUILD=1` on the **Preview** environment only after Preview `DATABASE_URL` is a non-production Neon database or branch. This is how you apply migrations to Preview without waiting for a Production deploy.

Do **not** set `RUN_MIGRATE_ON_BUILD=1` on Preview while `DATABASE_URL` still points at Production.

Local `npm run build` also skips migrate/ensure-rbac unless you set `RUN_MIGRATE_ON_BUILD=1` or `VERCEL_ENV=production`. Apply local migrations with `npm run db:deploy` (or `npx prisma migrate deploy`).

## Complementary: migrate connection URL

Unpooled Neon URLs (`DIRECT_URL` → `DATABASE_URL_UNPOOLED` → `DATABASE_URL`) are handled by `scripts/migrate-deploy.mjs`. That is independent of this gate. See `docs/MIGRATIONS.md`.

## Cron

Production must set `CRON_SECRET`. `GET /api/cron/alerts` requires `Authorization: Bearer $CRON_SECRET` and returns 401 without it. Do not change `vercel.json` cron schedules.
