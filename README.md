# Safeway Couriers

Professional medical courier website for Columbus and Central Ohio.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Edit company details

Update `lib/site.ts` for:

- Address, phone, and email
- Services, industries, and compliance copy
- Quote form options
- `showInsuredBadge` and `showBackgroundScreenedBadge` (keep `false` until those items are implemented)

Quote submissions currently confirm on the page. Connect `lib/submit-quote.ts` to email or an API before launch.
