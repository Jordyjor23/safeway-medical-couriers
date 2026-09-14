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

- Set `DATABASE_URL` (Neon pooled, for app runtime). For migrate, set optional `DIRECT_URL` or rely on Neon’s `DATABASE_URL_UNPOOLED`. Also set `BETTER_AUTH_URL=https://portal.safewaycouriers.com` and the other secrets listed in `.env.example`
- Build command: `node scripts/vercel-build.mjs` (via `npm run build`)
- That script **always** runs `npx prisma generate` then `next build`
- It runs **`npx prisma migrate deploy`** and `ensure-rbac` **only** when `VERCEL_ENV=production` **or** `RUN_MIGRATE_ON_BUILD=1`
- Preview/Development builds skip those DB writes by default so they cannot mutate Production. See `docs/PREVIEW-DATABASE.md`
- `migrate deploy` applies pending migrations only. It does **not** run `migrate dev`, `migrate reset`, or seed.
- See `docs/PRODUCTION-DEPLOYMENT.md` for DNS and domain steps.

## 0002_account_rbac_upgrade

Adds account status, unique usernames, sequential employee/driver/client IDs, custom role keys, deliveries, incidents, and employee tasks. Existing data is preserved.

```bash
npx prisma migrate deploy
npx prisma db seed
```

Owner account: visit `/setup` with `OWNER_SETUP_SECRET`. Never commit passwords.

## 20260914010000_phase1_applicant_compliance

Additive Phase 1 upgrade for applicant accounts, server-side application drafts, document review metadata, HR/compliance policy domains, requirement assignments, applicant→employee conversion records, and e-signature stub tables.

- Adds `Applicant.userId`, `Application.draftPayload`, `ApplicationNote.visibleToApplicant`
- Adds application statuses `INTERVIEW`, `DOCUMENTS_REQUIRED`, `COMPLIANCE_REVIEW`, `REJECTED`
- Adds document categories `HR`, `APPLICANT`, `DELIVERY`, `CUSTOMER`, `PHI_OPERATIONAL` and `DocumentPolicyDomain`
- Adds review metadata columns on `ManagedDocument` (no drops)
- Adds `RequirementAssignment`, `ApplicantEmployeeConversion`, `SignatureRequest`, `SignatureSigner`, `SignatureEvent`
- No table/column drops, no reset, no truncate

```bash
npx prisma migrate deploy
npx prisma db seed
```

## 20260914020000_phase1_hardening

Additive Phase 1 hardening (malware scan status, document ACL metadata). No drops.

## 20260914030000_phase1_5_operational_content

Additive company compliance library (`CompanyDocument`, assignments, acknowledgments). No drops.

## 20260914040000_phase1_5_compliance_schema_extension

Additive controlled document register, implementation tasks, service authorization matrix, richer assignment actions, and library categories.

- Adds `ControlledDocument`, `ComplianceImplementationTask`, `ServiceAuthorization`
- Adds enum values to `CompanyLibraryCategory` and `CompanyAssignmentAction` (no removals)
- Adds nullable `controlledDocumentId` on assignments and acknowledgments
- Makes `CompanyDocumentAcknowledgment.companyDocumentId` nullable so section acknowledgments do not collide
- No table/column drops, no reset, no truncate
- Seed templates stay `PENDING_SOURCE` / inactive / OPEN until owner action and master upload

Do not run this against production from this agent. Preview environments apply it via the existing `migrate deploy` build path.

