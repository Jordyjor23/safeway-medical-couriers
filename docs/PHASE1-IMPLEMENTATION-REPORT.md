# Phase 1 Implementation Report

Applicant identity, secure documents, applicant-to-employee conversion, and HR/compliance separation.

**Branch:** `cursor/safeway-phase1-applicant-compliance`  
**Base:** `main` at `7f53de3`  
**Migrations:** `prisma/migrations/20260914010000_phase1_applicant_compliance`, `prisma/migrations/20260914020000_phase1_hardening`  
**Constraint:** Upgrade in place. No ADNGEN / logistics-platform changes. No production deploy. No e-signature provider. No Phase 2.

---

## 1. Audit findings addressed

Confirmed against `docs/APPLICANT-EMPLOYEE-COMPLIANCE-PORTAL-AUDIT.md` (PR #2) before coding.

| Audit finding | Phase 1 response |
| --- | --- |
| No applicant accounts / `APPLICANT` role / `Applicant.userId` | Added system role, optional `Applicant.userId`, `/register`, applicant portal |
| Drafts lived in `localStorage`; `DRAFT` unused by API | Server `Application.draftPayload` + authenticated save/resume |
| `ApplicantDocument` unused and invisible to ACL | Wired through upload/persist/ACL include |
| Hire conversion dropped documents | Idempotent `convertApplicationToEmployee` relinks same `documentId` |
| Employees could not self-upload | `documents.upload` for EMPLOYEE/DRIVER; employee document center |
| HR files could attach to deliveries | Policy domains + `canAttachDocumentToDelivery` |
| Dashboard stats were org-wide | `getDashboardOverview(ctx)` filters cards by permission |
| No signed URL issuance | HMAC token + `/signed-url` route; still private storage |
| No malware hook | Scanner adapter with fail-safe `UNSCANNED` (never treated as verified safe) |
| E-sign missing | Additive `SignatureRequest` / `Signer` / `Event` stubs only |

---

## 2. Architecture

One Next.js app, one `User`, one `ManagedDocument` table.

```
User 1—1 Applicant?
User 1—1 Employee?
Applicant 1—* Application *—* ManagedDocument (ApplicantDocument)
Employee 1—* ManagedDocument (EmployeeDocument)
HIRED → convertApplicationToEmployee() relinks documentId (no blob copy)
```

Applicant home: `/applicant/dashboard`. Staff ATS, employee portal, private Blob, Better Auth, and compliance requirements were extended, not replaced.

---

## 3. Database

Additive only:

- `Applicant.userId`
- `Application.draftPayload`
- `ApplicationNote.visibleToApplicant`
- New `ApplicationStatus` values: `INTERVIEW`, `DOCUMENTS_REQUIRED`, `COMPLIANCE_REVIEW`, `REJECTED`
- New `DocumentCategory` values: `HR`, `APPLICANT`, `DELIVERY`, `CUSTOMER`, `PHI_OPERATIONAL`
- `DocumentPolicyDomain`
- `ManagedDocument` review fields: `uploadedAt`, `reviewedAt`, `reviewedBy`, `approvedAt`, `issueDate`, `verificationDate`, `policyDomain`
- `ComplianceRequirement` flags (`category`, `documentType`, `active`, reminder/issue/expiration)
- `RequirementAssignment`
- `ApplicantEmployeeConversion` (unique `applicationId`)
- `SignatureRequest`, `SignatureSigner`, `SignatureEvent`

Existing statuses, `resumeFileKey`, joins, and Better Auth tables were not dropped.

---

## 4. Migrations

`20260914010000_phase1_applicant_compliance`

Uses `ADD VALUE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and `CREATE TABLE IF NOT EXISTS`. No `DROP`, no `TRUNCATE`, no `migrate reset`.

Apply with `npx prisma migrate deploy` only.

---

## 5. Files added or changed (high level)

**New libraries:** `lib/documents/policy.ts`, `review-status.ts`, `malware.ts`, `signed-url.ts`, `signed-url-issue.ts`, `lib/applications/*`, `lib/applicant-account.ts`, `lib/compliance/requirements.ts`

**New routes:** `/register`, `/applicant/*`, `/api/applicant/register`, `/api/applicant/applications`, `/api/portal/documents/[id]/signed-url`

**Extended:** Prisma schema, document ACL/persist/upload/operations, permissions/RBAC, dashboards, careers apply form, hire conversion, seed/ensure-rbac, file download route

**Tests:** `tests/phase1-security.test.ts`, `tests/phase1-conversion.test.ts`, `tests/phase1-lifecycle.test.ts` plus updates to existing association picker expectations

---

## 6. Authentication model

- Applicants create accounts at `/register` (custom provision + Better Auth sign-in). Public Better Auth signup remains disabled.
- Login, logout, and password reset reuse the existing Better Auth flows.
- `APPLICANT` cannot open staff, admin, dispatch, operations, driver, employee, or customer portals.
- After hire, `EMPLOYEE` is added; `homePathForRoles` prefers employee home when both roles exist.
- Session is the only trusted identity. Client `userId` / `applicantId` / `employeeId` / `ownerId` values are ignored or overwritten.

---

## 7. Category / policy rules

`policyDomainFor(category, documentType)` maps storage categories to:

`HR | APPLICANT | COMPLIANCE | DELIVERY | CUSTOMER | PHI_OPERATIONAL | CORPORATE`

Rules:

- HR / APPLICANT / COMPLIANCE cannot attach to deliveries
- Delivery/PHI types do not appear in employee HR lists
- Applicant-only files are not treated as unlinked corporate files
- Operational document queries exclude applicant/HR isolated domains
- Access depends on **role and domain**, not ID guessing

---

## 8. Application workflow

Statuses supported: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `INTERVIEW` (plus existing interview request/scheduled), `CONDITIONAL_OFFER`, `DOCUMENTS_REQUIRED`, `COMPLIANCE_REVIEW`, `HIRED`, `REJECTED`, `WITHDRAWN` (plus existing `NOT_SELECTED` / `POSITION_FILLED` / screening / onboarding).

Each transition writes `ApplicantStatusHistory` (application id, previous, next, actor, timestamp, optional note).

Applicants see `applicantSafeStatusLabel` only. Internal notes stay hidden unless `visibleToApplicant` is set.

---

## 9. Document workflow

Reuse `ManagedDocument` + private Blob.

Owners: applicant (via `ApplicantDocument`) or employee (via `EmployeeDocument`).

Review states (derived): REQUIRED, UPLOADED, PENDING_REVIEW, APPROVED, REJECTED, EXPIRED, EXPIRING_SOON.

Replacement uses existing supersede/archive. Files are not hard-deleted.

---

## 10. Conversion workflow

`convertApplicationToEmployee`:

1. Return existing conversion if present (relink any missing employee joins)
2. Else create/link `Employee` from applicant + job
3. Insert `EmployeeDocument` rows for the **same** `documentId`
4. Update `ownerEntity`/`ownerId`/`policyDomain` without changing `blobKey` / `contentSha256`
5. Promote applicant user to `EMPLOYEE` when present
6. **Revoke the active `APPLICANT` role** (`applicant.role.revoked_after_hire`). Applicant/application/document/conversion rows stay for audit.
7. Upsert `ApplicantEmployeeConversion`
8. Audit `applicant.converted_to_employee`

Running twice does not create a second employee or duplicate joins. Idempotent re-runs still revoke `APPLICANT` if it was re-added. `ensureApplicantProfile` will not re-grant `APPLICANT` to an employee/driver.

---

## 11. Employee self-service

Employees/drivers can upload their own compliance files, view status, and see rejection reasons. They cannot approve their own documents, edit verifier fields, or change expiration/issue dates.

---

## 12. Admin / owner review

Authorized HR/admin/compliance roles can view applicant and employee compliance files, verify, reject (reason required), request replacement via new upload/supersede, assign requirements, set issue/expiration dates, and see version + status history. Review actions write `AuditLog`.

---

## 13. Compliance requirement engine

Reuses `ComplianceRequirement` + `DocumentRequirementRule`. Seed is idempotent (`upsert` by key).

Adds/preserves: HIPAA, BBP, OSHA, DOT/HazMat, DL, insurance, MVR auth, background auth, company training, confidentiality, resume. Assignment by applicant, employee, job, or manual `RequirementAssignment`.

---

## 14. Dashboards

- **Applicant:** applications, status, missing requirements, uploads, visible messages
- **Employee:** required/missing, pending, approved, rejected, expiring, expired + self-upload
- **Owner/Admin:** existing command center plus pipeline/review cards, **hidden** when the role lacks the matching permission (sales no longer sees applicant/compliance volumes)

---

## 15. Tests

New coverage for applicant/employee IDOR, driver vs admin HR, unauthenticated signed URLs, swapped document IDs, owner-payload stripping, conversion relink/idempotency, expiration derivation, server drafts, public-lookup removal, duplicate-application linkage, malware fail-safe, OCR encryption gate, custom-role deny, and post-hire role revocation.

Existing Vitest files were not weakened. Association picker tests were extended with the new `applicant` flag.

---

## 16. Lint / typecheck / build

Local verification after the hardening pass:

- **Vitest:** 201 passed (19 files)
- **Lint:** pass (0 errors; 4 pre-existing warnings in `DocumentScanner` / `portal-account`)
- **Typecheck:** pass
- **Production build:** `npx next build` pass (Next.js 16.3.1). Full `npm run build` was not run against a live database because `vercel-build.mjs` also executes `prisma migrate deploy`.

---

## 17. Environment / dependencies

No new production dependencies. No paid scanners or e-sign SDKs.

Uses existing `BETTER_AUTH_SECRET` for HMAC download tokens (`DOCUMENT_SIGNED_URL_SECONDS`, cap 300s).

---

## 18. Limitations

- **Legacy public POST** `POST /api/careers/applications` still accepts a one-shot unauthenticated submit for emails that do **not** already have a user account. Status, drafts, and documents are not available on that path.
- Unauthenticated **GET** status/document lookup is removed (`401`). `/careers/status` and the confirmation page only point at login/register.
- Malware adapter is real (status persisted) but no production scanner is configured. Uploads stay `UNSCANNED` / `UNVERIFIED` and are never treated as verified safe.
- Signed URLs are HMAC tokens to the existing private stream, not public Blob URLs
- Signature tables are unused by UI
- Postgres RLS is **not** enabled in this PR (see Phase 1.1 plan below)
- Production OCR remains disabled unless `DATA_ENCRYPTION_KEY` is a 32-byte base64 key. Raw text is encrypted when that key is present.

---

## 19. Risks

- Legacy public submit can still create a first application for an email with no account. Repeat submits for the same applicant+job reuse the existing row. If that email later registers, `Applicant.userId` is linked and further public submits are refused.
- Conversion now **removes** `APPLICANT` while preserving history. A hired user cannot re-enter the applicant portal unless a new `APPLICANT` role is assigned by an owner (not done automatically).
- Policy mapping treats some legacy `COMPLIANCE` specimen types as `PHI_OPERATIONAL` — confirm with counsel if any labeled type should stay HR
- Custom roles cannot receive Phase 1 ATS/HR document permissions. Grant a system role (`HR_RECRUITER`, `ADMIN`, `OWNER`, `COMPLIANCE_ADMIN`) instead.
- App-level ACL is the only row filter until Phase 1.1 RLS.

---

## 20. Decisions requiring owner approval

1. Retire the remaining legacy public POST and require login for all new applications?
2. When should Phase 2 enable a real e-sign provider, and which one?
3. Which production malware scanner should replace the unconfigured adapter?
4. Approve the Phase 1.1 RLS migration after a staging rehearsal?

---

## 21. Phase 1 hardening (this pass)

| Residual | Change |
| --- | --- |
| Public status/document lookup | `GET /api/careers/applications` returns 401. Status, drafts, and documents require an `APPLICANT` session. Confirmation page no longer loads PII by tracking+email. |
| Duplicate identity | Shared `decideApplicationWrite` / email `userId` link. Public apply refused when the applicant already has an account. Same applicant+job reuses the open application. |
| Malware | Adapter records `malwareScanStatus`. Unconfigured/no-op → `UNSCANNED`, `verifiedSafe: false`. Infected uploads rejected. HR verify remains a separate human step. |
| OCR | Production extraction is off without `DATA_ENCRYPTION_KEY`. `extractionRawText` is encrypted when written in production. |
| Custom roles | `PHASE1_RESTRICTED_PERMISSIONS` cannot be assigned to non-system roles. ATS/HR document review requires a system HR role. |
| Post-hire | Successful conversion deletes the active `APPLICANT` `UserRole` and audits it. History rows remain. |
| RLS | Not implemented here. Concrete Phase 1.1 plan is below. |

### How custom roles receive Phase 1 permissions

They do **not** receive them from the roles UI. Phase 1 applicant list/edit, screening, sensitive documents, and verify are system-role-gated (`OWNER`, `ADMIN`, `HR_RECRUITER`, and view-only `COMPLIANCE_ADMIN`). To give a person that access, assign one of those system roles. Saving a custom role strips any previously granted restricted keys.

---

## 22. Phase 1.1 Postgres RLS plan (not in this PR)

Prisma connects as a single table-owner role. Enabling `FORCE ROW LEVEL SECURITY` in this additive Phase 1 migration would either no-op (owner bypasses RLS) or break every query unless the app sets `SET LOCAL` session vars on every request. That is a connection-pool and migration risk. Do **not** ship it with Phase 1.

**Goal:** defense in depth mirroring `documentsListWhere` / `applicationsListWhere`.

**Tables and policies**

| Table | Policy intent |
| --- | --- |
| `Applicant` | `app.user_id` may select the row where `userId = current_setting('app.user_id')`. HR roles (`app.hr_review = 'on'`) may select all. |
| `Application` | Applicant: `applicantId` in (own `Applicant.id`). HR review: all. Deny insert/update unless applicant-own draft/submit or HR edit. |
| `ApplicantDocument` | Visible if the session owns the parent application or `app.hr_review = 'on'`. |
| `EmployeeDocument` | Visible if `employeeId` matches `app.employee_id` or `app.hr_review = 'on'`. |
| `ManagedDocument` | Visible via join to `ApplicantDocument` / `EmployeeDocument` the session may see, or HR/compliance system role. Sensitive rows additionally require `app.view_sensitive = 'on'` unless owner-self. |
| `ApplicationNote` | Applicant may select only `visibleToApplicant = true` on own applications. HR may select all. |
| `ApplicantEmployeeConversion` | HR review only (history is staff-audit). |

**Session contract (every request, transaction-local)**

```sql
SET LOCAL app.user_id = '<auth user id>';
SET LOCAL app.applicant_id = '<or empty>';
SET LOCAL app.employee_id = '<or empty>';
SET LOCAL app.hr_review = 'on'|'off';
SET LOCAL app.hr_edit = 'on'|'off';
SET LOCAL app.view_sensitive = 'on'|'off';
```

Use a dedicated `safeway_app` login role that is **not** table owner, with `FORCE ROW LEVEL SECURITY` on the tables above. Migrations and `ensure-rbac` keep using the owner role.

**Rollout**

1. Create `safeway_app` and grant DML only.
2. Add policies as `PERMISSIVE` + `FORCE` on a staging clone; run the full Vitest + portal smoke set.
3. Fail closed: missing settings → no rows.
4. Do not enable on production until staging shows zero Prisma errors for applicant, employee, HR, and owner sessions.

---

## 23. Phase 2 recommendations

- Real `SignatureProvider` adapters behind env flags (no paid calls until enabled)
- Webhook HMAC + `SignatureEvent.externalEventId` idempotency
- Store completed signed PDF as a new immutable `ManagedDocument`
- Applicant re-request notifications + richer pipeline UX
- Auto-derive `ComplianceRecord` from verified files
- Execute the Phase 1.1 RLS plan after staging rehearsal
- Wire a production malware scanner into `setMalwareScanner`
