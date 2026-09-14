# Phase 1 Implementation Report

Applicant identity, secure documents, applicant-to-employee conversion, and HR/compliance separation.

**Branch:** `cursor/safeway-phase1-applicant-compliance`  
**Base:** `main` at `7f53de3`  
**Migration:** `prisma/migrations/20260914010000_phase1_applicant_compliance`  
**Constraint:** Upgrade in place. No ADNGEN / logistics-platform changes. No production deploy. No e-signature provider.

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
| No malware hook | `lib/documents/malware.ts` no-op scanner interface |
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
6. Upsert `ApplicantEmployeeConversion`
7. Audit `applicant.converted_to_employee`

Running twice does not create a second employee or duplicate joins.

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

New coverage for applicant/employee IDOR, driver vs admin HR, unauthenticated signed URLs, swapped document IDs, owner-payload stripping, conversion relink/idempotency, expiration derivation, and server drafts.

Existing Vitest files were not weakened. Association picker tests were extended with the new `applicant` flag.

---

## 16. Lint / typecheck / build

Local verification on this branch:

- **Vitest:** 190 passed (18 files)
- **Lint:** pass (0 errors; 4 pre-existing warnings in `DocumentScanner` / `portal-account`)
- **Typecheck:** pass
- **Production build:** `npx next build` pass (Next.js 16.3.1). Full `npm run build` was not run against a live database because `vercel-build.mjs` also executes `prisma migrate deploy`.

---

## 17. Environment / dependencies

No new production dependencies. No paid scanners or e-sign SDKs.

Uses existing `BETTER_AUTH_SECRET` for HMAC download tokens (`DOCUMENT_SIGNED_URL_SECONDS`, cap 300s).

---

## 18. Limitations

- Public one-shot apply still exists for users who do not create an account; save/resume and uploads require an applicant login
- Malware scanner is a no-op hook
- Signed URLs are HMAC tokens to the existing private stream, not public Blob URLs
- Signature tables are unused by UI
- `GET /api/careers/applications` remains a fallback lookup (now rate-limited)
- Postgres RLS is not enabled
- OCR raw text encryption was not added in this phase

---

## 19. Risks

- Existing staff roles receive new permissions only through `ensure-rbac` merge of newly added keys; custom roles must be granted `applicants.self.*` / applicant ACL explicitly if needed
- Conversion promotes the applicant user to employee; applicant history is preserved
- Policy mapping treats some legacy `COMPLIANCE` specimen types as `PHI_OPERATIONAL` — confirm with counsel if any labeled type should stay HR
- Public apply + account apply can both create applications for the same email if an older applicant row exists; linkage uses unique email

---

## 20. Decisions requiring owner approval

1. Keep public unauthenticated submit as a fallback, or require login for all new applications?
2. After hire, keep the `APPLICANT` role for audit (current) or revoke it?
3. When should Phase 2 enable a real e-sign provider, and which one?
4. Should malware scanning be a paid integration or stay no-op?

---

## 21. Phase 2 recommendations

- Real `SignatureProvider` adapters behind env flags (no paid calls until enabled)
- Webhook HMAC + `SignatureEvent.externalEventId` idempotency
- Store completed signed PDF as a new immutable `ManagedDocument`
- Applicant re-request notifications + richer pipeline UX
- Auto-derive `ComplianceRecord` from verified files
- Optional Postgres RLS mirroring `documentsListWhere`
- Encrypt `extractionRawText` at rest
- Decide whether to retire public tracking-number GET
