# Safeway Couriers

Professional medical courier website for Columbus and Central Ohio.

**Production URL:** [https://www.safewaycouriers.com](https://www.safewaycouriers.com)

The Next.js app lives at the **repository root** (`package.json`, `next.config.ts`, and `app/`). GitHub default branch is `main`.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

Recommended host is Vercel. Project: `safeway-meds/safeway-medical-couriers`.

In the Vercel dashboard:

- **Production Branch:** `main`
- **Root Directory:** leave empty (repo root)
- Attach `safewaycouriers.com` and `www.safewaycouriers.com`

Apex (`safewaycouriers.com`) 308-redirects to `https://www.safewaycouriers.com` via `vercel.json`.

### DNS at the registrar

Point the domain at Vercel (use the exact records Vercel shows if they differ):

- **www** — `CNAME` to `cname.vercel-dns.com`
- **Apex** (`safewaycouriers.com`) — `A` / `ALIAS` as Vercel instructs

SSL is issued automatically on Vercel after DNS propagates. The site is not live on this domain until those records are attached in Vercel and at the registrar.

## Edit company details

Update `lib/site.ts` for:

- Canonical site URL (`site.url`)
- Address, phone, and email
- Services, industries, and compliance copy
- Quote form options
- `showInsuredBadge` and `showBackgroundScreenedBadge` (keep `false` until those items are implemented)

Quote submissions currently confirm on the page. Connect `lib/submit-quote.ts` to email or an API before launch.

## Internal business portal

This repository also includes the owner/staff portal at `/dashboard`. It is not a separate SaaS product.

1. Create Postgres (`docker compose up -d` or Vercel/Neon).
2. Copy `.env.example` to `.env.local` and set secrets (`openssl rand -base64 32`).
3. `npx prisma migrate deploy`
4. `npx prisma db seed`
5. Open `/setup` with `OWNER_SETUP_SECRET` to create the first owner. There is no default password.

See `docs/IMPLEMENTATION-REPORT.md` and `docs/MIGRATIONS.md`. Legal notices require attorney/HR review before production hiring use.
