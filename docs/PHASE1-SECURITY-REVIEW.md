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
- After hire, `EMPLOYEE` is added. Home path prefers employee over applicant when both roles exist.

## RBAC

- New permissions: `applicants.self.view`, `applicants.self.edit`.
- `APPLICANT` may view/download/upload own documents only.
- `EMPLOYEE` / `DRIVER` gained `documents.upload` for **own** employee association only.
- Verify still requires `documents.verify` and an HR/admin/compliance role. Employees cannot self-approve.
- Dashboard statistics are filtered by permission. Sales/account managers no longer receive applicant or compliance volume cards.

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
- Application list/detail helpers (`applicationsListWhere`, `canAccessApplication`) are deny-by-default for applicants.

## Private storage and signed URLs

- Files remain in private Vercel Blob. No public object URLs are minted.
- Downloads still stream through `/api/portal/documents/[documentId]/file` after ACL.
- Optional short-lived HMAC tokens (`createDocumentAccessToken`) bind `documentId` + `userId` + expiry.
- Unauthenticated callers cannot obtain a token (`issueDocumentSignedUrl` returns 401).
- A token for document A cannot be reused for document B.

## File validation

- Existing MIME/magic-byte allowlist, extension checks, size cap, and filename sanitization are unchanged.
- SHA-256 hashing and visible-duplicate warnings remain.
- `scanUploadedFile` is an integration point; the default engine is `noop` and does not log bytes.

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

- Public tracking-number GET is still a shared-secret lookup (now rate-limited). Prefer account login for new applicants.
- App-level WHERE clauses only; no Postgres RLS.
- OCR `extractionRawText` is still stored in Postgres if extraction is enabled.
- Custom roles created in the UI do not automatically receive Phase 1 applicant permissions.

## Tests that prove the controls

See `tests/phase1-security.test.ts` and `tests/phase1-conversion.test.ts`.
