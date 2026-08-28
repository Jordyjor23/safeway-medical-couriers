# Database migrations

## 0001_init

Creates authentication tables (Better Auth), RBAC, careers/ATS, employees, customers, contracts, documents, compliance tracking, notifications, and the append-only audit log.

Apply locally:

```bash
docker compose up -d
cp .env.example .env.local
# set BETTER_AUTH_SECRET, OWNER_SETUP_SECRET, and DATA_ENCRYPTION_KEY
npx prisma migrate deploy
npx prisma db seed
```

Apply on Vercel after attaching hosted Postgres (never localhost):

- Set `DATABASE_URL` (and optional `DIRECT_URL` for pooled hosts), `BETTER_AUTH_URL=https://portal.safewaycouriers.com`, and the other secrets listed in `.env.example`
- Build command: `node scripts/vercel-build.mjs` (via `npm run build`)
- That script runs `npx prisma generate` then **`npx prisma migrate deploy`** then `next build`
- `migrate deploy` applies pending migrations only. It does **not** run `migrate dev`, `migrate reset`, or seed.
- See `docs/PRODUCTION-DEPLOYMENT.md` for DNS and domain steps.

## 0002_account_rbac_upgrade

Adds account status, unique usernames, sequential employee/driver/client IDs, custom role keys, deliveries, incidents, and employee tasks. Existing data is preserved.

```bash
npx prisma migrate deploy
npx prisma db seed
```

Owner account: visit `/setup` with `OWNER_SETUP_SECRET`. Never commit passwords.
