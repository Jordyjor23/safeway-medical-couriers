# CI and merge gates

Automated checks that should stop bad changes before they reach `main`. This document is for developers and for Pinky (release coordinator).

**This tests/CI work must not be merged by the tests agent.** Pinky coordinates release; a human merges after review.

Do not use these workflows to deploy to Production, rotate credentials, or run Production migrations.

## How CI works

### `CI` — `.github/workflows/ci.yml`

Runs on pull requests to `main`, pushes to `main`, and `workflow_dispatch`.

It does **not** run `npm run build` (that script runs `prisma migrate deploy` via `scripts/vercel-build.mjs`). It does **not** need a real database.

Jobs:

| Job (status check name) | What it does |
| --- | --- |
| `quality` | `npm ci` → `npx prisma generate` (dummy `DATABASE_URL` only; generate does not connect) → `npm run lint` → `npm run typecheck` → `npm test` (Vitest) |
| `playwright-config` | Installs Playwright Chromium and runs `npx playwright test --list` so the smoke suite parses without a live URL |

Unit tests must keep working without `DATABASE_URL`. Do not add Vitest cases that query Postgres.

### `E2E smoke` — `.github/workflows/e2e-smoke.yml`

Read-only Playwright smoke against an **already deployed** URL. No local Next boot. Never invoke `npm run build` here.

| Trigger | URL source |
| --- | --- |
| `workflow_dispatch` | Required input `base_url` (preview or `https://www.safewaycouriers.com`) |
| `schedule` (daily) | Repo secret `PLAYWRIGHT_BASE_URL` — skipped if the secret is unset |
| `pull_request` to `main` | Same secret, only if `PLAYWRIGHT_BASE_URL` is set; otherwise the job is skipped |

Smoke does not log in, does not submit quotes/applications, and does not need secrets other than the optional target URL.

`E2E smoke / smoke` is **not** a required merge check. Preview or production must already be reachable.

## Local commands

```bash
npm test              # Vitest once
npm run test:watch    # Vitest watch
npx prisma generate   # needed before typecheck if the client is missing
npm run lint
npm run typecheck
```

Playwright (preferred: hit a deployed URL; no local server):

```bash
npx playwright install chromium
PLAYWRIGHT_BASE_URL=https://www.safewaycouriers.com npm run test:smoke
```

Other scripts:

```bash
npm run test:e2e      # all Playwright projects (smoke + future chromium specs)
npm run test:e2e:ui   # Playwright UI mode
```

If `PLAYWRIGHT_BASE_URL` is unset and `SKIP_WEBSERVER` is unset, `playwright.config.ts` may start a **local** server with `npx prisma generate && npx next build && npx next start` — **not** `npm run build`. That path still does not migrate, but `/careers` is dynamic and needs a real DB at runtime. Prefer `PLAYWRIGHT_BASE_URL` for smoke.

Skip the local server even without a base URL:

```bash
SKIP_WEBSERVER=1 npx playwright test --list
```

## Branch protection for `main` (human / Pinky)

GitHub does not turn these files into merge blockers by themselves. Pinky (or a repo admin) must set branch protection.

Require these **exact status check names** before merge to `main`:

1. `quality`
2. `playwright-config`

In the GitHub UI they may appear as `CI / quality` and `CI / playwright-config`. Use the names GitHub lists under the `CI` workflow. Do **not** require `E2E smoke` / `smoke` until a stable `PLAYWRIGHT_BASE_URL` secret (or dispatch-only process) is in place — a skipped optional job can confuse protection rules.

### Checklist (Pinky)

- [ ] Settings → Branches → rule for `main`
- [ ] Require a pull request before merging
- [ ] Require status checks to pass: `quality` and `playwright-config`
- [ ] Require branches to be up to date before merging (optional but recommended)
- [ ] Do not allow the tests agent to merge
- [ ] Optional: add repository secret `PLAYWRIGHT_BASE_URL` = `https://www.safewaycouriers.com` (or a stable preview) for scheduled/PR live smoke
- [ ] Confirm Production deploys still happen only from `main` via Vercel, not from this workflow

## Production / preview smoke

1. Actions → **E2E smoke** → Run workflow
2. Set `base_url` to a preview URL or `https://www.safewaycouriers.com`
3. Run. Specs visit marketing pages and confirm unauthenticated `/dashboard` redirects to `/login`

Portal hostname: `https://portal.safewaycouriers.com`. On the marketing host, portal paths redirect to the portal host (`proxy.ts`); smoke follows that redirect and still expects sign-in.

## Scope reminder

Allowed in this tests/CI track: Vitest, Playwright, GitHub Actions, gate docs, Playwright scripts in `package.json`.

Out of scope: `prisma/schema.prisma`, `vercel.json`, `lib/auth.ts`, `scripts/vercel-build.mjs`, `scripts/migrate-deploy.mjs`, Production env vars, credential rotation, Production migrations, merging to `main`.
