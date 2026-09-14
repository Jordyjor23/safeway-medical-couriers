# Phase 1 Security Review

Applicant accounts, document ACL, HR/compliance isolation, and conversion.

This is a code review of the Phase 1 upgrade. It is not a penetration test.

---

## Authentication

- Applicant registration creates a Better Auth credential account and assigns only `APPLICANT`.
- Public Better Auth `/sign-up/email` remains blocked unless owner/staff headers are present.
- Login, logout, lockout, and password reset are unchanged staff-grade Better Auth flows.
- Applicants land on `/applicant/dashboard`. `canAccessPortal` denies staff/admin/dispatch/ops/driver/employee/customer shells.
- `proxy.ts` now treats `/applicant` as a protected portal path (cookie presence only; real auth is server-side).
- After hire, `EMPLOYEE` is added and the active `APPLICANT` role is **removed**. Home path uses the employee portal. Applicant/application/document/conversion history remains.

## RBAC

- New permissions: `applicants.self.view`, `applicants.self.edit`.
- `APPLICANT` may view/download/upload own documents only.
- `EMPLOYEE` / `DRIVER` gained `documents.upload` for **own** employee association only.
- Verify still requires `documents.verify` and an HR/admin/compliance role. Employees cannot self-approve.
- Dashboard statistics for applicants require a system HR review role (`OWNER`, `ADMIN`, `HR_RECRUITER`, `COMPLIANCE_ADMIN`), not a custom role with `applicants.view`.
- Custom roles cannot be granted Phase 1 restricted permissions (`applicants.*`, `documents.viewSensitive`, `documents.verify`, `employees.sensitive.view`). Assign a system HR/admin role instead.

## Ownership

- `persistManagedDocument` writes `ownerEntity` / `ownerId` from server-side associations, not from the client.
- `sanitizeDocumentOwnerInput` strips `ownerId`, `ownerEntity`, `userId`, `applicantId`, `employeeId`, `organizationId`, and `role`.
- Applicant uploads force `applicantId` from the session. Employee uploads force `employeeId` from the session.
- Replacement history uses supersede; files are archived, not hard-deleted.

## IDOR

- `canAccessManagedDocument` and `documentsListWhere` now include `applicantLinks`.
- Applicant-only files are no longer treated as unlinked corporate documents.
- Denied access continues to return **404 "Not found."** so existence is not leaked.
- Swapping a document id in a URL or signed-token request fails ACL or token document-id binding.
- Application list/detail helpers (`applicationsListWhere`, `canAccessApplication`) are deny-by-default for applicants and for custom roles. Staff review requires a system HR role, not `applicants.view` alone.
- `GET /api/careers/applications` no longer returns application data without a session.

## Private storage and signed URLs

- Files remain in private Vercel Blob. No public object URLs are minted.
- Downloads still stream through `/api/portal/documents/[documentId]/file` after ACL.
- Optional short-lived HMAC tokens (`createDocumentAccessToken`) bind `documentId` + `userId` + expiry.
- Unauthenticated callers cannot obtain a token (`issueDocumentSignedUrl` returns 401).
- A token for document A cannot be reused for document B.

## File validation

- Existing MIME/magic-byte allowlist, extension checks, size cap, and filename sanitization are unchanged.
- SHA-256 hashing and visible-duplicate warnings remain.
- `scanUploadedFile` is an adapter boundary. The default engine is **unconfigured**: result is `UNSCANNED`, `verifiedSafe: false`, `clean: null`. Skip/no-op is never treated as clean. Infected verdicts reject the upload. Persisted `malwareScanStatus` defaults to `UNSCANNED`. HR `VERIFIED` is a separate human step and does not imply a scanner ran.

## Category isolation

- `policyDomainFor` classifies HR, APPLICANT, COMPLIANCE, DELIVERY, CUSTOMER, PHI_OPERATIONAL, CORPORATE.
- HR / APPLICANT / COMPLIANCE cannot be associated onto deliveries, including by admin.
- Operational list queries exclude applicant/HR isolated domains.
- PHI operational types (chain of custody, specimen, temperature logs) are not treated as employee HR files.

## Applicant / employee isolation

| Actor | Cannot access |
| --- | --- |
| Applicant A | Applicant B files or applications |
| Employee A | Employee B HR/compliance files |
| Driver | Unlinked or other-employee admin HR files |
| Applicant | Staff, dispatch, customer, employee dashboards |
| Unauthenticated user | Signed download URLs |

Internal reviewer notes are hidden unless `visibleToApplicant` is explicitly set.

## Admin privileges

- Owner/Admin/HR/Compliance can review applicant and employee compliance documents.
- Review, reject, archive, and conversion write `AuditLog`.
- Conversion is idempotent on `applicationId` and does not copy blob bytes.
- Owner-only keys (`settings.manage`, screening, finance) are unchanged.

## Sensitive logging

- Upload/download/review/conversion audits store ids, hashes, and status — not file contents.
- Draft save audits do not persist the form payload in `AuditLog` metadata.
- Forbidden application keys (SSN, banking, medical demographics) remain rejected.
- Signature event metadata is reserved for sanitized provider events in a later phase.

## Residual risks

- **Legacy public POST** remains for emails that do not already have a user account. It cannot look up status or documents. Repeat apply for the same job is idempotent. If the email already has `Applicant.userId`, the API returns 409 and tells the user to sign in.
- Confirmation and `/careers/status` no longer return application PII to anonymous callers. The confirmation URL still displays the tracking number from the path (receipt only).
- App-level WHERE clauses only; **Postgres RLS is not enabled**. See Phase 1.1 plan in `docs/PHASE1-IMPLEMENTATION-REPORT.md` (exact tables: `Applicant`, `Application`, `ApplicantDocument`, `EmployeeDocument`, `ManagedDocument`, `ApplicationNote`, `ApplicantEmployeeConversion`).
- Production OCR stays disabled without `DATA_ENCRYPTION_KEY`. If extraction is later enabled with that key, `extractionRawText` is stored encrypted; structured extracted fields are still plaintext review rows.
- No production malware scanner is configured. Files upload as `UNSCANNED` and must not be described as scan-verified safe.
- A hired user who is later manually re-assigned `APPLICANT` would regain applicant-portal access; conversion will revoke it again on the next hire path, and `ensureApplicantProfile` will not auto-re-grant it to employees.

## Tests that prove the controls

See `tests/phase1-security.test.ts`, `tests/phase1-conversion.test.ts`, and `tests/phase1-hardening.test.ts`.
