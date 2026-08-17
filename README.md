# Safeway Couriers

Professional medical courier website for Columbus and Central Ohio.

**Production URL:** [https://www.safewaycouriers.com](https://www.safewaycouriers.com)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

Recommended host is Vercel. After the project is linked:

```bash
npx vercel --prod
npx vercel domains add www.safewaycouriers.com
npx vercel domains add safewaycouriers.com
```

In the Vercel dashboard, add both `safewaycouriers.com` and `www.safewaycouriers.com` to the project. Apex (`safewaycouriers.com`) 308-redirects to `https://www.safewaycouriers.com` via `vercel.json`.

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
