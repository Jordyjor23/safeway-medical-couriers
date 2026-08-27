# Safeway Couriers — Internal Portal Implementation Report

**Status:** Inspection complete. This document is the pre-development report required before Phase A–G work.

**Attorney/HR review:** Legal copy (EEO, FCRA, acknowledgements, privacy, retention, classification language) is versioned and configurable. It is **not** a substitute for counsel review before production use.

## 1. Existing technology stack

| Layer | Current |
| --- | --- |
| Framework | Next.js **16.3.1** App Router, React **19.2.8**, TypeScript |
| Styling | Tailwind CSS **4**, Plus Jakarta Sans, navy/medical design tokens in `app/globals.css` |
| UI | Server components + a few client components (`Navbar`, `QuoteForm`) |
| Icons | `lucide-react` |
| Hosting | Vercel (`vercel.json` apex→www 308). Production: `https://www.safewaycouriers.com` |
| SEO | `app/sitemap.ts`, `app/robots.ts`, metadata in `app/layout.tsx` |
| Config | Company copy and nav in `lib/site.ts` |
| Tests | None (no test runner) |
| Auth / DB / API | **None** |

Public routes today: `/`, `/about`, `/services`, `/quote`, `/contact`, `/compliance`, `/privacy`, `/terms`.

Quote submissions are a client-side stub (`lib/submit-quote.ts`) and do not persist.

## 2. Existing database / authentication

There is **no database, no session system, and no user accounts**. The root layout always renders the public `Navbar` and `Footer`.

Owner passwords will never be hard-coded. Credentials stay in environment variables / the database password hash only.

## 3. Proposed database changes

Add **PostgreSQL** (Vercel Postgres or Neon in production; Docker Compose locally) with **Prisma**.

Identity (Better Auth) stays separate from employee/customer/applicant profiles.

Core entities (UUIDs for externally referenced records):

- Auth: `User`, `Session`, `Account`, `Verification`, `TwoFactor`
- RBAC: `Role`, `Permission`, `RolePermission`, `UserRole`
- Careers: `CareerCategory`, `JobOpening`, `JobQuestion`
- Recruiting: `Applicant`, `Application`, `ApplicationEmployment`, `ApplicantDocument`, `Interview`, `ApplicantStatusHistory`, `ApplicationAcknowledgement`
- FCRA (architected, not auto-reject): `BackgroundScreening`, `BackgroundScreeningEvent`
- Workforce: `Employee`, `EmployeeDocument`, `EmployeeTraining`, `EmployeeCertification`, `OnboardingChecklist`, `OnboardingStep`, `NewHireReport`
- CRM: `Customer`, `CustomerContact`
- Contracts: `Contract`, `ContractAmendment`
- Files: `ManagedDocument` (private object storage keys, never public `/public` files)
- Compliance: `ComplianceRequirement`, `ComplianceRecord`
- Ops: `Notification`, `NotificationPreference`, `AuditLog`, `LegalDocument`, `SystemSetting`

Sensitive future fields (SSN, tax, DL numbers, background reports) are **not** collected on the public application. When stored later, they use application-level encryption (`DATA_ENCRYPTION_KEY`) and restricted permissions.

## 4. Proposed routes

**Public (marketing chrome preserved)**

- `/careers` — careers landing (DB-backed openings)
- `/careers/jobs/[jobId]` — job detail
- `/careers/apply/[jobId]` — application
- `/careers/apply/confirmation/[trackingNumber]` — confirmation
- `/careers/status` — applicant status lookup (tracking + email)
- `/careers/privacy`, `/careers/eeo`, `/careers/accessibility` — notices
- `/login`, `/forgot-password`, `/reset-password`, `/two-factor`, `/setup` (first owner only)

**Protected portal** (`/dashboard/*`) — own shell, no public nav/footer

- `/dashboard` — owner command center
- `/dashboard/applicants`, `/dashboard/applicants/[id]`
- `/dashboard/jobs`
- `/dashboard/employees`, `/dashboard/employees/[id]`
- `/dashboard/customers`, `/dashboard/customers/[id]`
- `/dashboard/contracts`, `/dashboard/contracts/[id]`
- `/dashboard/documents`
- `/dashboard/compliance`
- `/dashboard/notifications`
- `/dashboard/audit`
- `/dashboard/settings`, `/dashboard/users`, `/dashboard/security`

**APIs:** `/api/auth/[...all]` (Better Auth); `/api/portal/*` and `/api/careers/*` with server-side permission checks. Public APIs never return other applicants, hashes, or internal notes.

## 5. Proposed RBAC implementation

True **server-side** authorization on every mutation and sensitive read.

- Granular permissions (`jobs.view`, `applicants.screening.view`, `employees.sensitive.view`, …)
- Roles receive permission sets; OWNER receives all
- OWNER cannot be deleted or demoted except by another OWNER, and never if it would leave zero owners
- UI hiding is convenience only
- `proxy.ts` (Next.js 16) does optimistic cookie checks; pages and route handlers call `auth.api.getSession` + `requirePermission`

Roles: OWNER, HR_RECRUITER, OPERATIONS_ADMIN, DISPATCHER, COMPLIANCE_ADMIN, SALES_ACCOUNT_MANAGER, EMPLOYEE, CUSTOMER.

## 6. Security implications

- Public site currently allows all crawlers; `/dashboard`, `/login`, `/setup`, and `/api/` must be `noindex` / `Disallow`
- Moving Navbar/Footer into a marketing route group so the portal is not wrapped in public chrome
- Session cookies: httpOnly, Secure in production, SameSite=Lax
- Password hashing via Better Auth (scrypt); min length 12; leaked-password check where available
- Login rate limits + lockout counters in DB (serverless-safe)
- MFA (TOTP) required for OWNER after first login; encouraged for other staff
- CSRF: Better Auth origin checks + Next.js; portal mutations are server actions / POST APIs only
- Files: Vercel Blob private; short-lived signed URLs; no guessable public paths
- Audit log is append-only at the application layer (no delete API)
- Do not put secrets in client bundles; `NEXT_PUBLIC_*` only for non-sensitive site URL

## 7. Environment variables / services required

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL |
| `BETTER_AUTH_SECRET` | Auth signing (≥32 chars) |
| `BETTER_AUTH_URL` | Canonical origin (`https://www.safewaycouriers.com`) |
| `OWNER_SETUP_SECRET` | One-time owner bootstrap at `/setup` |
| `DATA_ENCRYPTION_KEY` | 32-byte key for future sensitive-field encryption |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (documents) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Transactional email (reset, application confirmation) |
| `CRON_SECRET` | Expiration-alert job auth |

Optional later: consumer-reporting-agency API, e-signature provider, Ohio new-hire transmission. **Not** implemented as live integrations in this phase.

## 8. Migration strategy

1. Add Prisma schema + initial migration (`0001_init`).
2. Seed permissions, roles, career categories, legal-document versions, default settings. **No owner password.**
3. Owner created via `/setup` when zero owners exist and `OWNER_SETUP_SECRET` matches.
4. Later phases add UI/APIs against the same schema; additive migrations only.
5. Vercel: attach Postgres + Blob + env vars; run `prisma migrate deploy` on build.

## 9. Features that require external services

| Feature | Service |
| --- | --- |
| Persistence | PostgreSQL (Neon / Vercel Postgres) |
| Private files | Vercel Blob (or S3-compatible later) |
| Email | Resend (or SMTP later) |
| MFA | TOTP authenticator apps (no SMS vendor required) |
| E-signature | Architected only (DocuSign/Dropbox Sign later) |
| I-9 / tax / SSN | Restricted onboarding records; no unsecured forms |
| FCRA consumer reports | Standalone workflow + audit; CRA API later |
| Ohio new-hire reporting | Status tracking only until an authorized integration exists |

## 10. Existing functionality that could be affected

| Risk | Mitigation |
| --- | --- |
| Root layout always shows marketing nav | Route groups: `(marketing)` vs `(auth)` vs `(portal)` |
| `robots.ts` allows `/` for all paths | Disallow dashboard/auth/API; keep public pages indexable |
| `sitemap.ts` | Add `/careers` and notice pages; never add `/dashboard` |
| `nav` / `footerNav` in `lib/site.ts` | Add Careers + legal links; do not remove existing items |
| Quote form stub | Unchanged |
| Vercel redirects / `public/CNAME` | Unchanged |
| Domain, fonts, colors, components | Reuse `PageHeader`, `Container`, `SectionHeading`, tokens |
| Build size / Node runtime | Auth + Prisma need Node; keep marketing pages static where possible |

Phase order: A (schema, auth, RBAC, setup, dashboard shell) → B (careers + apply) → C (ATS) → D (employees/onboarding) → E (CRM) → F (contracts/docs) → G (analytics, notifications, audit hardening).
