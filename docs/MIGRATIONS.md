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

Apply on Vercel after attaching Postgres:

- Set `DATABASE_URL` and auth secrets
- Build command may remain `prisma generate && next build`
- Run `prisma migrate deploy` and `prisma db seed` once (Vercel CLI or a release command)

Owner account: visit `/setup` with `OWNER_SETUP_SECRET`. Never commit passwords.
