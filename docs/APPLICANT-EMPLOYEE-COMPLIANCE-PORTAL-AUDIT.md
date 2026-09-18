# Applicant / Employee Compliance Portal — Pre-Implementation Audit

**Status:** Audit only. No application code, schema, dependencies, or migrations were changed for this report.

**Repository:** [Jordyjor23/safeway-medical-couriers](https://github.com/Jordyjor23/safeway-medical-couriers)

**Audited against:** `main` at commit `7f53de3` (`fix: publish public contact details and legal pages`)

**Scope:** Existing dashboard architecture, Prisma schema, authentication, RBAC, document management, private storage, employee management, applicant/careers workflow, notifications, APIs, related tests, expiration/reminder infrastructure, compliance models, and HR vs delivery/PHI separation.

**Docs used as context (then verified against code):** `docs/IMPLEMENTATION-REPORT.md`, `docs/ACCOUNT-RBAC-REPORT.md`, `docs/MIGRATIONS.md`, `docs/PRODUCTION-DEPLOYMENT.md`, `README.md`, `AGENTS.md`, `CLAUDE.md`.

**Important doc caveat:** `docs/IMPLEMENTATION-REPORT.md` is a **pre-build** plan. It still claims “Tests: None” and “Auth / DB / API: None.” That is stale. The live app already has Better Auth, Prisma, RBAC, careers ATS, employees, documents (phases 2–6), and Vitest coverage. Treat `docs/ACCOUNT-RBAC-REPORT.md` and this audit as the current picture.

---

## Executive summary

This repo is **not** a greenfield portal. It is already a single Next.js 16 App Router application with:

- a public marketing/careers site
- Better Auth staff/employee/customer logins
- a staff business portal at `/dashboard`
- role-specific shells (`/admin`, `/operations`, `/dispatch`, `/driver`, `/employee`, `/customer`)
- a private Vercel Blob document library with row-level ACL, SHA-256 duplicate detection, MIME/magic-byte validation, OCR review, and expiration cron
- an ATS-shaped recruiting model (`Applicant` / `Application` / status history) that is **staff-only** after a public submit + tracking-number lookup

The target upgrade (applicant accounts, save/resume, e-sign, applicant→employee conversion that preserves files/signatures/audit, role-isolated document center, certification reminders, HR/PHI separation, recruiting status machine) should **extend these models**, not replace them.

Largest gaps vs the target:

| Target capability | Current state |
| --- | --- |
| Applicant portal account | **Missing.** No `APPLICANT` role, no `Applicant.userId`, no applicant login |
| Server-side save/resume | **Missing.** `ApplicationStatus.DRAFT` exists but public POST always creates `SUBMITTED`; drafts live in `localStorage` |
| Applicant uploads / missing requirements / re-requests | **Schema stub only.** `ApplicantDocument` and `resumeFileKey` have **zero** application usage |
| E-signature workflow | **Schema stub only** on `Contract.esignProvider` / `esignEnvelopeId`. No `SignatureProvider`, no envelope states, no webhooks |
| Applicant → employee conversion preserving docs | **Partial.** `HIRED` creates an `Employee` + portal user; **does not** copy/relink documents, acknowledgements, or files |
| Employee document center | **Partial.** Employee dashboard shows buckets; employees **cannot upload**; no required/submitted/pending/approved first-class UX |
| Certification & compliance tracking | **Partial.** Seeded requirements + manual `ComplianceRecord` + document rules + reminders. `EmployeeCertification` unused. Records not auto-synced from verified files |
| HR vs delivery/PHI isolation | **Partial.** Association-based ACL exists; there is **no** document classification vault. `COMPLIANCE` types include specimen/chain-of-custody next to HR categories |
| Owner/Admin/Employee/Applicant UX cards | **Partial.** Owner/admin/employee cards exist; **no applicant cards** |
| Recruiting pipeline | **Partial.** Close to the target machine, missing `DOCUMENTS_REQUIRED` and a dedicated compliance-review status; transitions are unconstrained |
| Tests listed in the product brief | **Partial.** Strong unit ACL/auth/document tests; **no** conversion, webhook, e-sign, or signed-doc immutability tests |

**Recommendation:** Upgrade in place. Reuse `User` + Better Auth, `ManagedDocument` + private Blob, `Application` / `Employee` / `ComplianceRequirement` / `Notification` / `AuditLog`. Add an `APPLICANT` role, link `Applicant` to `User`, wire `ApplicantDocument`, add additive signature tables, and tighten ACL so HR files cannot be associated onto delivery records.

---

## 1. Current architecture

### 1.1 Stack

| Layer | Actual |
| --- | --- |
| Framework | Next.js **16.3.1** App Router, React **19.2.8**, TypeScript |
| Auth | Better Auth **1.7.2** (`lib/auth.ts`) — email/password, username plugin, bearer plugin, TOTP 2FA, Prisma adapter |
| Database | PostgreSQL via Prisma **6.16.x** (`prisma/schema.prisma`) |
| Files | Vercel Blob **private** (`lib/storage.ts`, `@vercel/blob`) |
| Email | Resend (`lib/email.ts`) |
| Tests | Vitest (`tests/*.test.ts`) |
| Hosting | Vercel; marketing `www.safewaycouriers.com`, portal `portal.safewaycouriers.com` |
| Edge gate | Root `proxy.ts` (Next.js 16 cookie/host/HTTPS/CORS gate; no `middleware.ts`) |

There is **one application**. The portal is not a separate SaaS codebase.

### 1.2 Route groups

Route groups do **not** appear in URLs. There is no `app/(portal)/layout.tsx`; each portal prefix has its own layout.

**Public marketing** — `app/(marketing)/`

| URL | File |
| --- | --- |
| `/` | `app/(marketing)/page.tsx` |
| `/about`, `/services`, `/quote`, `/contact`, `/compliance`, `/privacy`, `/terms` | matching `page.tsx` files |
| `/careers` | `app/(marketing)/careers/page.tsx` |
| `/careers/jobs/[jobId]` | `app/(marketing)/careers/jobs/[jobId]/page.tsx` |
| `/careers/apply/[jobId]` | `app/(marketing)/careers/apply/[jobId]/page.tsx` |
| `/careers/apply/confirmation/[trackingNumber]` | `app/(marketing)/careers/apply/confirmation/[trackingNumber]/page.tsx` |
| `/careers/status` | `app/(marketing)/careers/status/page.tsx` |
| `/careers/eeo`, `/careers/privacy`, `/careers/accessibility` | notice pages |

**Auth** — `app/(auth)/`

| URL | File |
| --- | --- |
| `/login` | `app/(auth)/login/page.tsx` |
| `/forgot-password`, `/reset-password`, `/reset-password/[token]` | password reset |
| `/activate`, `/activate-account` | activation |
| `/set-password` | forced password change |
| `/two-factor` | TOTP |
| `/setup` | first owner bootstrap (`OWNER_SETUP_SECRET`) |

**Staff business portal** — `app/(portal)/dashboard/`  
Layout: `app/(portal)/dashboard/layout.tsx` → `requirePortal("staff")` + `PortalSidebar`.

| URL | Purpose |
| --- | --- |
| `/dashboard` | Owner/staff command center |
| `/dashboard/applicants`, `/dashboard/applicants/[applicationId]` | ATS |
| `/dashboard/jobs`, `/new`, `/[jobId]` | Job openings |
| `/dashboard/employees`, `/dashboard/employees/[employeeId]` | Workforce |
| `/dashboard/customers`, `/[customerId]` | CRM |
| `/dashboard/contracts`, `/[contractId]` | Contracts |
| `/dashboard/documents`, `/[documentId]`, `/review`, `/alerts` | Document library |
| `/dashboard/compliance` | Manual compliance records |
| `/dashboard/notifications` | In-app inbox |
| `/dashboard/audit` | Audit log (view) |
| `/dashboard/users`, `/[userId]`, `/roles`, `/settings`, `/security` | Admin/IAM |
| `/dashboard/deliveries/[deliveryId]` | Delivery detail (staff) |

**Role shells** (each has its own `layout.tsx` + `requirePortal(...)`):

| URL | Gate | File |
| --- | --- | --- |
| `/admin/dashboard` | `admin` | `app/(portal)/admin/dashboard/page.tsx` |
| `/operations/dashboard` | `operations` | `app/(portal)/operations/dashboard/page.tsx` |
| `/operations/documents`, `/review`, `/[documentId]` | operations document UI | `app/(portal)/operations/documents/*` |
| `/dispatch/dashboard`, `/dispatch/deliveries/[deliveryId]` | `dispatch` | `app/(portal)/dispatch/*` |
| `/driver/dashboard` | `driver` | `app/(portal)/driver/dashboard/page.tsx` |
| `/employee/dashboard` | `employee` (also DRIVER/DISPATCHER) | `app/(portal)/employee/dashboard/page.tsx` |
| `/customer/dashboard` | `customer` | `app/(portal)/customer/dashboard/page.tsx` |
| `/portal` | router | `app/(portal)/portal/page.tsx` → `homePathForRoles` |
| `/owner/dashboard` | owner alias | redirects to `/dashboard` |

There are **no** routes under `app/employee`, `app/applicant`, or `app/(applicant)`. Applicants never enter a logged-in portal.

### 1.3 Role → home path

From `lib/permissions.ts` `homePathForRoles`:

| Role | Home |
| --- | --- |
| `OWNER` | `/dashboard` |
| `ADMIN` | `/admin/dashboard` |
| `OPERATIONS_MANAGER` | `/operations/dashboard` |
| `DISPATCHER` | `/dispatch/dashboard` |
| `DRIVER` | `/driver/dashboard` |
| `HR_RECRUITER`, `OPERATIONS_ADMIN`, `COMPLIANCE_ADMIN`, `SALES_ACCOUNT_MANAGER` | `/dashboard` |
| `EMPLOYEE` | `/employee/dashboard` |
| `CUSTOMER` | `/customer/dashboard` |

`canAccessPortal(..., "staff")` allows OWNER, ADMIN, HR_RECRUITER, OPERATIONS_ADMIN, COMPLIANCE_ADMIN, SALES_ACCOUNT_MANAGER. Drivers, employees, customers, and dispatchers are bounced off `/dashboard/*`.

### 1.4 Request path

1. `proxy.ts` — HTTPS, marketing→portal host rewrite, cookie presence check on `isProtectedPortalPath` (`/dashboard`, `/portal`, `/owner`, `/admin`, `/operations`, `/dispatch`, `/driver`, `/employee`, `/customer`, `/set-password`).
2. Layout/page — `requirePortal` / `requirePermission` / `requireAuth` via Better Auth session + DB roles (`lib/rbac.ts`).
3. Mutations — `"use server"` actions in `app/(portal)/dashboard/*/actions.ts` and `app/(portal)/deliveries/actions.ts`.
4. Files — never public Blob URLs; `GET /api/portal/documents/[documentId]/file` streams after `canAccessManagedDocument(..., "download")`.

Cookie check in `proxy.ts` is **optimistic only**. Real authorization is server-side. That is the correct pattern and should be kept.

### 1.5 Data architecture (high level)

Identity (`User`) is separate from workforce (`Employee`) and recruiting (`Applicant`). Linking today:

- `Employee.userId?` — portal login for employees/drivers
- `CustomerUser.userId` — customer tenant login
- `Application.applicationId` unique on `Employee` — hire link
- **`Applicant` has no `userId`**

Documents are a single `ManagedDocument` table with join tables: `EmployeeDocument`, `ApplicantDocument`, `CustomerDocument`, `ContractDocument`, `DeliveryDocument`. ACL is computed from those joins in `lib/documents/access.ts`. **`ApplicantDocument` is not included in `DOCUMENT_ACCESS_INCLUDE`**, so applicant-only files would be treated as unlinked if they existed.

### 1.6 Migrations already applied (do not reset)

| Migration | Purpose |
| --- | --- |
| `prisma/migrations/20260827120000_init` | Auth, RBAC, ATS, employees, CRM, contracts, documents, compliance, notifications, audit |
| `prisma/migrations/20260828000000_account_rbac_upgrade` | Account status, usernames, custom role keys, deliveries, incidents, tasks |
| `prisma/migrations/20260828210000_document_lifecycle` | Lifecycle/verification/SHA-256/supersede |
| `prisma/migrations/20260828220000_document_extraction_review` | OCR fields + review |
| `prisma/migrations/20260829000000_document_notifications` | Notification dedupe / thresholds |

`docs/MIGRATIONS.md` documents additive deploy via `prisma migrate deploy` only.

---

## 2. What functionality already exists

### 2.1 Authentication

Implemented in `lib/auth.ts`, `lib/account-status.ts`, `lib/activation.ts`, `lib/password.ts`, `lib/portal-account.ts`.

- Email **or** username login; public signup disabled unless `x-owner-setup` / `x-staff-create` headers
- First owner via `/setup` + `OWNER_SETUP_SECRET` (only if zero owners)
- 8-hour sessions, 5-fail / 15-minute lockout, account statuses (`PENDING_ACTIVATION`, `ACTIVE`, `LOCKED`, `SUSPENDED`, `INACTIVE`, `TERMINATED`)
- Activation tokens hashed (SHA-256) in `Verification`, 7-day TTL
- Temporary password + must-change-password flow (`/set-password`)
- TOTP 2FA; owner dashboard banner if MFA is off
- Password reset with generic success message
- Last-owner protection (`canChangeOwnerAssignment`)
- `GET /api/portal/me` for session identity + roles + permissions
- Append-only `AuditLog` via `writeAuditLog` (`lib/audit.ts`) — no delete API
- AES-256-GCM helpers `encryptSecret` / `decryptSecret` (`lib/crypto.ts`) for future restricted fields

### 2.2 RBAC

- 59 permission keys in `lib/permissions.ts` `PERMISSIONS`
- 11 system roles in `SYSTEM_ROLE_KEYS`
- DB-backed enforcement: `getAuthContext` loads `UserRole` → `RolePermission` → `Permission` (OWNER loads all DB permissions)
- Owner UI to create custom roles and edit permission sets: `/dashboard/roles` (`permission.manage`)
- Seed/merge in `lib/ensure-rbac.ts` / `prisma/seed.ts` (does not wipe Owner edits of existing role-permission rows)
- Isolation helpers: `assertSameCustomer`, `assertSameEmployee`, `canAccessManagedDocument`, `documentsListWhere`

Default matrix (code, not just docs):

| Role | Notable grants |
| --- | --- |
| OWNER | All keys |
| ADMIN | Daily ATS/CRM/docs including `documents.verify` and `documents.viewSensitive`; **not** owner-only keys |
| HR_RECRUITER | Jobs, applicants, employees, training, documents (incl. sensitive), notifications |
| COMPLIANCE_ADMIN | Compliance/training/incident/docs verify + sensitive |
| OPERATIONS_MANAGER | Drivers, dispatch, deliveries, incidents, documents (no `documents.viewSensitive`) |
| OPERATIONS_ADMIN | View-heavy ops + documents |
| DISPATCHER | Dispatch/deliveries + `documents.view` / `download` (delivery-scoped in ACL) |
| DRIVER | Own deliveries + own/assigned documents |
| EMPLOYEE | Training, own documents, incidents |
| SALES_ACCOUNT_MANAGER | Customers/contracts/docs (no employee docs in ACL role set) |
| CUSTOMER | Own-org deliveries/contracts/docs |

Owner-only keys (`OWNER_ONLY_PERMISSIONS`): `settings.manage`, `system.manage`, `permission.manage`, `roles.manage`, `finance.view`, `billing.manage`, `applicants.screening.view`, `employees.sensitive.view`.

### 2.3 Public careers / ATS (staff side)

**Public**

- DB-backed openings (`JobOpening`, `CareerCategory`, `JobQuestion`)
- Apply form `components/careers/ApplicationForm.tsx` → `POST /api/careers/applications`
- IP rate limit: 5 applications / 15 minutes
- Forbidden-field guard (`assertNoForbiddenApplicationKeys`) blocks SSN/DOB/salary/demographics keys
- Legal acknowledgements stored as `ApplicationAcknowledgement` against current `LegalDocument` rows (`application-acknowledgement`, `applicant-privacy`)
- Confirmation email + tracking number `SWC-{year}-{6}` (`lib/ids.ts`)
- Status lookup `GET /api/careers/applications?tracking=&email=` returns `publicApplicationView` only (name, position, status, submittedAt)
- Public status labels in `lib/careers-content.ts`

**Staff ATS** (`/dashboard/applicants`)

- List/filter (excludes `DRAFT`)
- Detail: overview, employment history, interview create, notes, FCRA screening **status display**, status history
- `updateApplicationStatus` writes `ApplicantStatusHistory` + audit `applicant.status.changed`
- On `HIRED` (if no employee yet): create `Employee`, onboarding checklist, `NewHireReport`, `provisionEmployeePortalUser` + `issueActivation`

Existing `ApplicationStatus` enum:

`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `INTERVIEW_REQUESTED`, `INTERVIEW_SCHEDULED`, `CONDITIONAL_OFFER`, `BACKGROUND_SCREENING`, `ONBOARDING`, `HIRED`, `POSITION_FILLED`, `WITHDRAWN`, `NOT_SELECTED`

FCRA model exists (`BackgroundScreening`, `BackgroundScreeningEvent`, `encryptedReportKey`) and is **display-only** in the UI, gated by `applicants.screening.view` (OWNER-only).

### 2.4 Employee management

- Create employee (`createEmployee`) with `SC-EMP-####` / `SC-DRV-####`, onboarding steps from `lib/onboarding.ts`, portal user + activation
- Update profile, onboarding step status, add `EmployeeTraining`, update Ohio new-hire **tracking** (not transmitted)
- Employee detail document section with buckets + staff uploader
- Hire-from-application path (above)
- Employee self-portal: profile, documents (read), training, tasks, incident submit

Onboarding step keys already cover the restricted-hire surface the target wants later (I-9, tax, direct deposit, HIPAA ack, driver docs, MVR, background): `OnboardingStepKey` in `prisma/schema.prisma`. These are **checklist statuses**, not collected forms or e-sign.

### 2.5 Document management system

Mature module under `lib/documents/` plus staff/ops UIs.

**Storage**

- `storePrivateFile` / `readPrivateFile` — `access: "private"`, key `private/{uuid}/{storedFileName}`
- Downloads via authenticated stream, `Cache-Control: private, no-store`, audit `document.downloaded`
- `documentFileHref` → `/api/portal/documents/${id}/file` (never a Blob URL)
- `signedUrlTtlSeconds()` exists (`DOCUMENT_SIGNED_URL_SECONDS`, cap 300s) but **is not used**; no client-facing signed URL is minted

**Validation** (`lib/documents/validate.ts`)

- Default 20 MB (`DOCUMENT_MAX_BYTES`)
- Allowlist: PDF, JPEG, PNG, HEIC/HEIF, DOCX
- Magic-byte detection; reject EXE/ELF/HTML/SVG/XML and extension mismatches
- Filename sanitization (`sanitizeDisplayFilename`, `sanitizeStoredFilename`)
- SHA-256 `contentSha256`; duplicate warning unless `allowDuplicate=1`

**Lifecycle**

- Stored workflow: `UPLOADED` → `PROCESSING` → `NEEDS_REVIEW` → `VERIFIED` / `REJECTED` / `SUPERSEDED` / `ARCHIVED`
- Verification: `UNVERIFIED` / `VERIFIED` / `REJECTED`
- Expiration **derived** in `derivedDocumentState` (`lib/documents/lifecycle.ts`); comment on `DocumentLifecycleStatus` says EXPIRING_SOON/EXPIRED are not stored there
- Supersede chain `supersedesId`
- Archive retains file + history

**ACL** (`lib/documents/access.ts`)

- Role sets: `EMPLOYEE_DOC_ROLES`, `CUSTOMER_DOC_ROLES`, `DELIVERY_DOC_ROLES`, `UNLINKED_DOC_ROLES`
- Restricted roles (DRIVER/EMPLOYEE/CUSTOMER) limited to own employee, own customer, or assigned delivery
- Sensitive docs require `documents.viewSensitive` unless owner or own-employee
- Denied access returns **404 “Not found.”** (good IDOR hygiene)
- Association pickers scoped in `searchDocumentAssociations`

**Catalog** (`lib/documents/types.ts`, `catalog.ts`)

Types already include the compliance set the target names: `HIPAA_TRAINING`, `BLOODBORNE_PATHOGENS`, `HAZMAT_HMR_TRAINING`, `OSHA_TRAINING`, `DRIVERS_LICENSE`, `AUTO_INSURANCE`, `MOTOR_VEHICLE_RECORD`, plus I-9/tax/direct-deposit types and delivery/PHI-adjacent types (`CHAIN_OF_CUSTODY`, `SPECIMEN_DOCUMENTATION`, `TEMPERATURE_LOG`).

**OCR / extraction** (optional Azure)

- Provider abstraction in `lib/documents/extraction/provider.ts` (`noop`, `azure`, `test`)
- Blocked field keys: SSN, banking, DOB, diagnosis, PHI, NPI (`lib/documents/extraction/types.ts`)
- Human review required; high-confidence fields can be accepted onto **document** dates/name only — not Employee/Customer profile fields
- Scanner UI (phase 6) is client scan-to-PDF, not OCR

**Compliance gate**

- `documentMayCountTowardRequirement` requires association + confirmed type + `VERIFIED`
- `documentSatisfiesRequirement` also requires active + not expired
- Seeded `DocumentRequirementRule` rows map HIPAA/BBP/DL/insurance/registration

### 2.6 Notifications and expiration

- Model `Notification` with unique `dedupeKey`
- Types already include document/compliance/application/system events
- Cron: `vercel.json` daily `GET /api/cron/alerts` at 13:00 UTC, Bearer `CRON_SECRET`
- `createExpirationNotifications` (`lib/expiration-alerts.ts`): contract reminders to OWNER + `runDocumentNotificationScheduler`
- Scheduler (`lib/documents/notification-scheduler.ts`): expiration windows, missing requirements, needs-review, email retry, recipient isolation, audit `document.notification.evaluated`
- Email off unless `DOCUMENT_EMAIL_NOTIFICATIONS=true`
- Copy sanitizer redacts SSN-like patterns and Blob URLs (`sanitizePublicText`)
- In-app inbox: `/dashboard/notifications`
- Settings: `/dashboard/settings` persists `documentNotifications` thresholds

### 2.7 Compliance tracking

Seeded `ComplianceRequirement` keys (`prisma/seed.ts`):

- `hipaa`, `bloodborne_pathogens`, `hazmat_awareness`, `un3373`, `sop_acknowledgement`, `driver_qualification`, `insurance`, `vehicle_registration`

Staff UI `/dashboard/compliance` manually upserts `ComplianceRecord` (`CURRENT` / `EXPIRING_SOON` / `EXPIRED` / `MISSING` / `NOT_REQUIRED`).

Disclaimer in schema and UI: presence of a file/record is **tracking status**, not a legal determination.

### 2.8 APIs that exist today

| Method | Path | Auth |
| --- | --- | --- |
| GET/POST | `/api/auth/[...all]` | Better Auth |
| OPTIONS/GET | `/api/portal/me` | Session |
| OPTIONS/POST | `/api/portal/documents` | `documents.upload` |
| OPTIONS/GET | `/api/portal/documents/[documentId]/file` | Session + document ACL |
| POST | `/api/careers/applications` | Public + IP rate limit |
| GET | `/api/careers/applications` | Public (tracking + email) |
| GET | `/api/cron/alerts` | `Authorization: Bearer ${CRON_SECRET}` |

Everything else is Server Actions, not REST.

### 2.9 Tests that already exist

| File | What it covers |
| --- | --- |
| `tests/authorization.test.ts` | Homes, portal ACL, employee/customer isolation helpers, owner assignment, lockout |
| `tests/rbac.test.ts` | Permission matrix, owner-only keys, multi-role union |
| `tests/activation.test.ts` | Token hash / consume |
| `tests/password-reset.test.ts` | Reset tokens |
| `tests/password.test.ts` | Password rules |
| `tests/portal-account.test.ts` | Credential issuer |
| `tests/applications.test.ts` | Forbidden keys, public view shape, form has no SSN field |
| `tests/schema-guards.test.ts` | No salary/SSN on `Application`; `encryptedSsn` on `Employee`; `ManagedDocument` extensions |
| `tests/documents-phase2.test.ts` | Document IDOR-style ACL, SHA-256 validation, lifecycle |
| `tests/documents-phase3.test.ts` | Catalog, filters, association ACL, buckets |
| `tests/documents-phase4.test.ts` | Extraction privacy, secure file endpoint vs Blob URL |
| `tests/documents-phase5.test.ts` | Notification scheduler, dedupe, recipient isolation |
| `tests/documents-phase6.test.ts` | Scanner, no OCR in scanner |
| `tests/email.test.ts`, `tests/app-url.test.ts` | Infra helpers |

These are **unit tests** of helpers and source-string guards, not HTTP integration tests.

---

## 3. What is partially implemented

### 3.1 Applicant workflow

| Piece | Partial because |
| --- | --- |
| `ApplicationStatus.DRAFT` | Enum + public label “Not submitted”; careers API never writes DRAFT |
| Client draft | `localStorage` key `safeway-application-${job.publicId}` — device-local, not resumable across browsers, stores PII in the browser |
| Status history | Written on submit and staff status changes; no transition rules, no applicant-visible history beyond current label |
| Interview | Create-only; no calendar integration |
| Communications / notes | Models + notes UI; `ApplicationCommunication` unused in UI |
| Background screening | Full FCRA state machine in schema; UI is a status sentence |
| Legal ack | Checkbox + `ApplicationAcknowledgement` — **not** an e-sign envelope |
| `resumeFileKey` | Column only |
| `ApplicantDocument` | Join model only; no upload, no query, not in ACL include |
| Hire conversion | Creates employee + login; drops document/signature continuity |

### 3.2 Employee document / compliance center

`/employee/dashboard` (`app/(portal)/employee/dashboard/page.tsx`) already buckets:

- Your documents (uploaded/current)
- Expiring soon / Expired / Rejected / Needs action
- Missing requirement **labels** via `missingRequirementLabels`

Gaps vs target cards (required / submitted / pending / approved / rejected / expiring / expired):

- No “required but not yet uploaded” card as a first-class list of requirement rows
- No employee **upload** (`EMPLOYEE` lacks `documents.upload`)
- `canOpenDetails={false}` — employees cannot open the staff document detail/review page
- `EmployeeCertification` is queried on the staff employee page and **never rendered**
- `ComplianceRecord` is manual and **not** updated when a document is verified
- Seeded document rules omit `hazmat_awareness`, `un3373`, `sop_acknowledgement` (requirements exist, no `DocumentRequirementRule`)
- No DOT HazMat / MVR / custom-requirement admin UI (MVR exists as document type `MOTOR_VEHICLE_RECORD` only)

### 3.3 Recruiting pipeline vs target

Target: Applied → Under Review → Interview → Conditional Offer → Documents Required → Background/Compliance Review → Hired (+ Rejected/Withdrawn)

Current mapping:

| Target | Current closest | Gap |
| --- | --- | --- |
| Applied | `SUBMITTED` | Naming only |
| Under Review | `UNDER_REVIEW` | OK |
| Interview | `INTERVIEW_REQUESTED` + `INTERVIEW_SCHEDULED` | Two statuses; no single “Interview” |
| Conditional Offer | `CONDITIONAL_OFFER` | OK |
| Documents Required | **none** | Missing enum + UX |
| Background/Compliance Review | `BACKGROUND_SCREENING` + `ONBOARDING` | Split; no compliance-review status |
| Hired | `HIRED` | Conversion incomplete |
| Rejected | `NOT_SELECTED` (+ `POSITION_FILLED`) | Naming |
| Withdrawn | `WITHDRAWN` | OK |

Staff can jump **any → any** status. No guard that documents are complete before `HIRED`.

### 3.4 E-signature

`Contract` has:

```text
esignProvider      String?
esignEnvelopeId    String?
```

Comment: “Future e-signature provider id (DocuSign / Dropbox Sign). Not a custom e-sign engine.”

Contract statuses already include `AWAITING_SIGNATURE`. There is **no** provider interface, no envelope table, no recipient/signer, no webhook route, no mock adapter, no e-consent capture beyond application legal checkboxes.

### 3.5 Sensitive-field encryption

- `Employee.encryptedSsn` exists
- `BackgroundScreening.encryptedReportKey` exists
- `DATA_ENCRYPTION_KEY` is documented
- `encryptSecret` / `decryptSecret` are **never called** from app code
- `employees.sensitive.view` is defined and tested as OWNER-only, but **no page or action checks it**

Onboarding copy tells staff that SSN belongs in the restricted workflow; there is no form that collects it.

### 3.6 Owner / Admin / Employee cards

- Owner `/dashboard`: live `StatCard`s from `getDashboardOverview` + `getDocumentAlertStats` (applicants, employees, contracts, document alerts, compliance)
- Admin `/admin/dashboard`: employee/customer/delivery + document alert counts
- Employee `/employee/dashboard`: profile + document buckets + training + tasks
- Applicant: **no portal, no cards**
- Driver/dispatch/customer: operational, not compliance-centered

Dashboard stats are **org-wide and unscoped by permission**. Any staff role that can open `/dashboard` (including `SALES_ACCOUNT_MANAGER`) sees applicant and compliance counts.

### 3.7 Notification system vs target reminders

Document expiration / missing / rejected / needs-review reminders exist and are deduped. Missing vs target:

- No signature-envelope reminders (Sent / Viewed / Expired)
- No applicant “re-request documents” notification type
- Contract emails are suppressed (`emailStatus: "SUPPRESSED"`)
- Document alerts page loads **global** notification rows (not `userId`-scoped) to show “last reminder”

### 3.8 Isolation helpers default-allow

`canAccessOwnEmployeeRecord` and `canAccessCustomerTenant` return **true** for roles that are neither privileged staff nor the restricted role. Tests encode this (`DISPATCHER` can “access” any customer id at the helper level). Document ACL is stricter than these helpers. Custom roles created in `/dashboard/roles` could inherit the default-allow if someone wires those helpers without also using document ACL.

---

## 4. What is missing (relative to the target upgrade)

This section is gap analysis only — do not build yet.

### 4.1 Applicant portal

Missing entirely:

- `APPLICANT` system role and permission set
- `Applicant.userId` (or equivalent) linking to `User`
- Applicant registration / invite / activation (could reuse `issueActivation` + `provisionEmployeePortalUser` patterns)
- Applicant home `/applicant/dashboard` (or similar) with cards: application status, missing requirements, uploads, signatures, messages
- Authenticated save/resume of `Application` as `DRAFT` (and later statuses)
- Applicant document upload into `ManagedDocument` + `ApplicantDocument`
- Missing-requirements checklist driven by job + `DocumentRequirementRule` / a new `ApplicationRequirement` table
- E-sign packages + e-consent
- Submit gate (all required docs + signatures)
- Applicant-visible status (richer than tracking lookup)
- Staff “re-request” that unlocks specific uploads and notifies the applicant
- Session isolation so an applicant cannot open `/dashboard` or another applicant’s files

### 4.2 Applicant → employee conversion

Missing:

- Relink (do **not** duplicate bytes) `ApplicantDocument` → `EmployeeDocument`
- Preserve `contentSha256`, blob key, acknowledgements, signature envelopes, audit actor history
- Convert applicant `User` to `EMPLOYEE` (or add role) without destroying the applicant record
- Conversion audit event (e.g. `applicant.converted_to_employee`)
- Idempotent conversion (today `HIRED` is guarded by `!current.employee`, which is good, but incomplete)

### 4.3 Employee document center (full)

Missing:

- Employee self-upload of required types
- First-class statuses: required / submitted / pending review / approved / rejected / expiring / expired
- Role isolation so a driver cannot see another employee’s HR packet (ACL exists for files; **not** for staff dashboard stats or alerts notifications query)
- Certification records UI (`EmployeeCertification`)
- Custom requirements per role/job
- Prevent associating an HR file onto a delivery (see §5)

### 4.4 Certification & compliance tracking

Missing or incomplete:

- Auto-derive `ComplianceRecord` from verified, unexpired, associated documents (scheduler already *reads* rules for alerts; it does not write records)
- Reminder coverage for HIPAA, BBP, OSHA, DOT HazMat, DL, insurance, MVR, custom — OSHA/MVR/HazMat rules are not seeded
- Admin CRUD for requirements and rules (today: seed + manual record upsert only)
- Distinct training completion vs document evidence

### 4.5 E-signature

Missing all of:

- `SignatureProvider` interface (mock first)
- Prepared DocuSign / Dropbox Sign adapters **with no paid API calls in this phase**
- Envelope state machine: Draft → Sent → Viewed → Signed → Completed (+ Declined / Canceled / Expired / Failed)
- E-consent record (IP, UA, document version, timestamp) — `ApplicationAcknowledgement` is the closest reuse
- Webhook endpoint + HMAC verification + idempotency keys
- Signed-document immutability (lock metadata / prevent overwrite of completed envelopes)
- Applicant/employee “sign this packet” UI

### 4.6 Security controls named in the target but not present

| Control | Current |
| --- | --- |
| Short-lived signed URLs | Helper only; stream path used instead (acceptable if kept private) |
| Postgres RLS | **None** — app-level WHERE only |
| Malware-scan hook | **None** (magic bytes only) |
| Never log document contents | OCR `extractionRawText` is stored on `ManagedDocument`; archive audit may include `blobKey` |
| Tenant/role isolation for applicants | No applicant tenant |
| Prevent IDOR / ownership changes | Document ACL is solid for current roles; association can **add** new owners (see §5) |
| Webhook authenticity | No webhooks |

### 4.7 Tests named in the product brief that do not exist

- Applicant/employee **authz** for the new portal surfaces
- Duplicate upload **HTTP** tests (unit duplicate helper exists)
- Expiration **cron route** auth tests
- Applicant→employee **conversion** tests
- Webhook **idempotency**
- Forged webhook **rejection**
- Signed document **immutability**

### 4.8 UX / recruiting admin

- Applicant cards
- Documents Required column/status
- Status history that applicants can see (redacted)
- Re-request workflow
- Separation of HR document library vs delivery document library in navigation

### 4.9 Intentionally out of scope (already documented as future)

Do **not** collect SSN, banking, or medical/PHI on the public application. Schema guards and form tests already enforce this. Restricted onboarding collection remains a later, explicitly designed workflow using `encryptedSsn` + `employees.sensitive.view`.

---

## 5. Security weaknesses discovered

Findings are ordered by relevance to the compliance portal. None of these were exploited; this is a code-review audit.

### 5.1 High — applicant identity is a shared secret, not an account

`GET /api/careers/applications` is unauthenticated. Knowledge of `tracking` + `email` returns status. There is **no rate limit** on GET (POST is limited). Tracking numbers are `SWC-{year}-{6}` from a 32-char alphabet (~1e9 space) — not trivial to brute force, but GET is an enumeration surface.

There is no applicant session, so there is no way to authorize uploads or signatures safely today.

### 5.2 High — hire conversion drops the evidence trail

`updateApplicationStatus` (`app/(portal)/dashboard/applicants/actions.ts`) on `HIRED` creates a new `Employee` and optional `User`. It does not:

- create `EmployeeDocument` rows from `ApplicantDocument`
- copy `resumeFileKey`
- re-home `ManagedDocument.ownerId` / associations
- attach `ApplicationAcknowledgement` to the employee

If applicant uploads are added later without fixing conversion, HR will lose or duplicate files.

### 5.3 High — `ApplicantDocument` is invisible to ACL

`DOCUMENT_ACCESS_INCLUDE` / `canAccessManagedDocument` / `documentsListWhere` consider employee, customer, contract, and delivery links only. An applicant-only document would look **unlinked**. Unlinked files are visible to `UNLINKED_DOC_ROLES` (OWNER, ADMIN, HR, OPS, COMPLIANCE). That is too broad for resumes/IDs and too open if a future upload path forgets to also add an employee link.

### 5.4 High — HR files can be attached to deliveries

`associateManagedDocument` **adds** links; it does not prevent an `EMPLOYEE_DOCUMENTS` / training / W-4 file from also receiving a `DeliveryDocument` row. Delivery-linked files are visible to `DELIVERY_DOC_ROLES` (includes DISPATCHER, SALES). That is a concrete HR↔ops leak path once staff use the association picker freely.

There is no “classification lock” (HR vs OPERATIONS/PHI) and no check that category matches association kind.

### 5.5 Medium — document alerts notification query is unscoped

`app/(portal)/dashboard/documents/alerts/page.tsx` loads up to 500 notifications of document/compliance types **without `userId` filter**. Anyone with `documents.view` (including roles that should not see other employees’ reminder copy) can join those titles to documents they can already list. Titles are mostly type labels, but this is still a cross-user notification leak and will change if copy becomes richer.

### 5.6 Medium — command-center stats ignore RBAC

`getDashboardOverview` and `getDocumentAlertStats` count **all** employees, applications, documents, and missing requirements. `/dashboard` uses `requireAuth` (layout is staff-only) and does not filter cards by `applicants.view` / `employees.view` / `compliance.view`. Sales/account managers who land on `/dashboard` see recruiting and compliance volumes.

`getDocumentAlertStats` also ignores `documentsListWhere` (org-wide counts).

### 5.7 Medium — browser drafts store applicant PII

`ApplicationForm` persists the full form (including employment history) to `localStorage`. Shared/kiosk devices retain applicant data after the tab is closed. This is not an IDOR, but it is the opposite of a secure save/resume design.

### 5.8 Medium — OCR raw text is a second copy of document contents

`ManagedDocument.extractionRawText` (`@db.Text`) stores review-only OCR. Comment says it is not used in library search (good). It is still sensitive content at rest in Postgres, outside Blob, with no extra encryption. Extraction blocked keys reduce structured SSN/bank fields, but raw text can still contain them.

### 5.9 Medium — unused sensitive-data controls

- `employees.sensitive.view` never consulted
- `encryptSecret` never called
- `ownerEntity` / `ownerId` on `ManagedDocument` never written by `persistManagedDocument`

Staff with `employees.view` + `employees.edit` can see/edit the full employee profile including onboarding notes. When SSN collection is added, the current employee page would be the wrong place unless gated.

### 5.10 Medium — default-allow isolation helpers

```ts
// lib/permissions.ts
// CUSTOMER mismatch → false; OWNER → true; everyone else → true
// DRIVER/EMPLOYEE mismatch → false; privileged → true; everyone else → true
```

Safe today only because pages also use `requirePermission`. Dangerous if reused for the applicant portal without an explicit deny-by-default.

### 5.11 Medium — public applicant email upsert

`Applicant.email` is unique. A later POST with the same email **overwrites** name/phone/address on the shared `Applicant` row and creates another `Application`. That can mix two people’s contact data onto one applicant record.

### 5.12 Low / hygiene

| Item | Detail |
| --- | --- |
| Email logs | `lib/email.ts` / `lib/activation.ts` log recipient addresses (not document contents) |
| Archive audit | `document.archived` metadata includes `blobKey` (storage path, not file bytes) |
| `createEmployee` | Requires `employees.edit`, not `employees.create` |
| `addApplicationNote` | Write gated by `applicants.notes.view` |
| `createIncident` | Gated by `incident.view` instead of `incident.manage` |
| `updateOnboardingStep` | Updates by `stepId` without verifying the step belongs to `employeeId` (staff with `employees.edit` can already edit anyone; integrity issue) |
| Status transitions | No server-side allow-list |
| Email verification | `requireEmailVerification: false` |
| GET careers status | No rate limit |
| MFA | Encouraged for owner, not enforced for HR/compliance |
| Postgres RLS | Absent; serverless app-level checks only |
| Malware | No scan hook / quarantine status |
| Signed URLs | Unused — do not start returning Blob URLs without the same ACL + TTL |
| `proxy.ts` | Cookie-only; documented. Confirm Next 16 still loads `proxy.ts` in the deployed runtime (unknown in this audit environment without `node_modules` runtime proof) |

### 5.13 What is already in good shape (do not regress)

- Private Blob + authenticated stream + 404 on deny
- SHA-256 + MIME allowlist + filename sanitization
- No public `/public` document hosting
- Public application schema/form guards against SSN/salary/demographics
- `publicApplicationView` strips ids/notes
- Document unit tests for customer/driver IDOR
- Cron protected by `CRON_SECRET`
- Audit log not deletable from the portal
- Forbidden extraction keys for SSN/bank/PHI-ish fields
- Last-owner protections
- Generic password-reset messaging

---

## 6. Existing schema / models that can be reused

Reuse these. Do **not** create a second document table, a second user table, or a second audit log.

### 6.1 Identity and RBAC

| Model | Reuse as |
| --- | --- |
| `User`, `Session`, `Account`, `Verification`, `TwoFactor` | Applicant + employee logins; activation; 2FA for staff |
| `Role`, `Permission`, `RolePermission`, `UserRole` | Add `APPLICANT` system role + permissions (`applicants.self.view`, `documents.self.upload`, etc.) |
| `AccountStatus` | Applicant pending activation / withdrawn |

### 6.2 Recruiting

| Model | Reuse as |
| --- | --- |
| `Applicant` | Profile; **add** optional `userId` |
| `Application` | Save/resume (`DRAFT`), submit, status |
| `ApplicationEmployment`, `ApplicationAnswer`, `JobQuestion` | Existing form |
| `ApplicantStatusHistory` | Admin pipeline history (already written) |
| `ApplicationAcknowledgement` + `LegalDocument` | E-consent / policy versions (extend, don’t replace) |
| `ApplicationNote`, `ApplicationCommunication` | Staff notes + re-request messages |
| `Interview` | Keep |
| `BackgroundScreening` (+ events) | Background/compliance review stage |
| `ApplicantDocument` | **Activate** — this is the applicant file join |

### 6.3 Workforce / compliance

| Model | Reuse as |
| --- | --- |
| `Employee` | Conversion target (`applicationId` already unique) |
| `EmployeeDocument` | Conversion target join (same `documentId`) |
| `EmployeeTraining` | Training completions with `expiresAt` |
| `EmployeeCertification` | **Activate** for cert names/issuers/dates |
| `OnboardingChecklist` / `OnboardingStep` | Post-hire restricted steps |
| `ComplianceRequirement` | HIPAA/BBP/OSHA/DOT/custom catalog |
| `DocumentRequirementRule` | Required document types + reminder JSON |
| `ComplianceRecord` | Per-employee status (prefer derive, keep manual override) |
| `EmployeeVehicle` | Insurance/registration dates already on the model |
| `NewHireReport` | Keep tracking-only |

### 6.4 Documents / storage

| Model / field | Reuse as |
| --- | --- |
| `ManagedDocument` | Single file object for applicant + employee + ops |
| `contentSha256`, `originalFileName`, `storedFileName`, `blobKey` | Duplicate detection + private storage |
| `lifecycleStatus`, `verificationStatus` | submitted/pending/approved/rejected |
| `expirationDate` + derived state | expiring/expired |
| `isSensitive` | HR flag (insufficient alone — add classification) |
| `supersedesId` | Replacement after reject |
| `DocumentExtractedField` | Optional assist; keep privacy blocks |
| `DocumentCategory` | Add or map a dedicated HR vs OPS split (additive enum value preferred over reuse of `COMPLIANCE` for PHI) |

### 6.5 Notifications / audit

| Model | Reuse as |
| --- | --- |
| `Notification` + `dedupeKey` | Reminders, re-requests, signature events |
| `NotificationType` | Add values (additive enum) |
| `AuditLog` | Conversion, signature, download, status |
| Cron `/api/cron/alerts` | Extend scheduler; do not add a second cron app |

### 6.6 E-sign foothold

Reuse the **idea** on `Contract.esignProvider` / `esignEnvelopeId`, but put the real workflow on **new** tables (see §9). Do not overload `Contract` for applicant offer letters and policy packets.

`ContractStatus.AWAITING_SIGNATURE` can stay for customer contracts.

### 6.7 Code modules to reuse (not duplicate)

| Module | Why |
| --- | --- |
| `lib/rbac.ts` | `requirePermission`, `requirePortal`, `requireApiAuth` |
| `lib/auth.ts` / `lib/activation.ts` / `lib/portal-account.ts` | Provision + activate applicants similarly to employees |
| `lib/storage.ts` + `lib/documents/validate.ts` + `upload.ts` + `persist.ts` | Same private pipeline |
| `lib/documents/access.ts` | Extend with `applicantLinks` + classification |
| `lib/documents/buckets.ts` | Extend labels for required/pending/approved |
| `lib/documents/notification-scheduler.ts` | Same dedupe/email pattern |
| `lib/application-schema.ts` | Keep forbidden-key guards |
| `lib/onboarding.ts` | Post-hire only |
| `components/portal/EntityDocumentsSection`, `DocumentUploader` | Employee/applicant UIs |
| `components/portal/StatCard` | Role dashboards |

### 6.8 Do not reuse for the wrong job

| Thing | Why not |
| --- | --- |
| `DeliveryDocument` | Ops/PHI chain-of-custody — not HR packets |
| Public `GET /api/careers/applications` | Not an authz mechanism for uploads |
| `localStorage` drafts | Client-only; replace with server DRAFT |
| `COMPLIANCE` document category as “all regulated files” | It currently lists specimen/POD types |
| New standalone app / new `Document` table | Violates “upgrade, don’t duplicate” |

---

## 7. Recommended architecture (upgrade, don’t duplicate)

### 7.1 Principles

1. **One Next.js app**, same route groups: add `(portal)/applicant/*`, do not fork a repo.
2. **One `User`**. Applicants, employees, and staff are roles on the same auth system.
3. **One `ManagedDocument`**. Joins express ownership. Conversion **relinks**, never copies bytes.
4. **Deny by default.** Extend `canAccessManagedDocument` / `documentsListWhere`; do not rely on `canAccessOwnEmployeeRecord`’s default `true`.
5. **Additive migrations only.** New enums/values/tables/columns. Never drop `ApplicationStatus` values, `resumeFileKey`, or join tables.
6. **Mock e-sign first.** Interface + in-process mock; DocuSign/Dropbox Sign files may exist but must not call paid APIs until explicitly enabled.
7. **HR vault vs ops vault** is an ACL + classification concern, not a second Blob account (unless counsel later requires it). Same private store, different `classification` and association rules.

### 7.2 Identity

```
User 1—1 Applicant?
User 1—1 Employee?
User *—* Role   (APPLICANT, and later EMPLOYEE after conversion)
```

- Applicant registers or is invited → `User` `PENDING_ACTIVATION` → role `APPLICANT` → `homePathForRoles` → `/applicant/dashboard`
- `canAccessPortal` gains `"applicant"`
- Staff portals remain unchanged
- On hire: keep `Applicant` row; set `Employee.applicationId` (already); add `EMPLOYEE` role; **remove or keep** `APPLICANT` (recommend keep for audit, hide applicant shell)

Reuse `provisionEmployeePortalUser` as a generalized `provisionPortalUser({ roleKey: "APPLICANT" | "EMPLOYEE" | "DRIVER" })`.

### 7.3 Application save/resume

- Authenticated `PATCH` / server actions write `Application` with `status: DRAFT` until submit
- Submit sets `SUBMITTED`, `submittedAt`, status history (already patterned in `POST /api/careers/applications`)
- Keep public apply URL working: either require login before apply, or create the user at first save
- Delete `localStorage` persist after server drafts work
- Keep tracking-number lookup as a **fallback** for users without accounts; add rate limit

### 7.4 Documents and requirements

```
JobOpening / role  →  DocumentRequirementRule / ApplicationRequirement
                         ↓
Applicant/Employee  →  ApplicantDocument / EmployeeDocument  →  ManagedDocument
                         ↓
                   ComplianceRecord (derived + override)
```

Applicant uploads call the existing `processDocumentUpload` with `applicantId` association (new join path). Same validation, SHA-256, private Blob.

Missing requirements = rules for that job/classification minus qualifying verified documents (`documentSatisfiesRequirement` already exists).

Staff re-request = create/reopen requirement rows + `Notification` + email.

### 7.5 Conversion

Single transactional function, e.g. `convertApplicationToEmployee(applicationId)` called from the existing `HIRED` branch:

1. Create/update `Employee` (already)
2. For each `ApplicantDocument`, insert `EmployeeDocument` with the **same** `documentId`
3. Optionally set `ManagedDocument.category` / classification to employee-HR if still applicant
4. Relink signature envelopes’ `subjectUserId` / keep application id
5. Provision or promote `User`
6. `writeAuditLog({ action: "applicant.converted_to_employee", metadata: { documentIds, envelopeIds } })`
7. Idempotent if `Employee.applicationId` already set

Do **not** re-upload or change `blobKey` / `contentSha256`.

### 7.6 E-sign

New module `lib/signatures/`:

```ts
interface SignatureProvider {
  createDraft(input): Promise<Envelope>
  send(envelopeId): Promise<Envelope>
  cancel(envelopeId): Promise<Envelope>
  handleWebhook(headers, rawBody): Promise<EnvelopeEvent> // mock: signed token
}
```

- `mock` provider updates states in DB without HTTP
- `docusign.ts` / `dropbox-sign.ts` **adapters prepared**, guarded by env flags defaulting off
- Envelope states match the brief
- Completed package stored as a new `ManagedDocument` (or lock the source PDF) marked immutable
- Webhook route `/api/signatures/webhooks/[provider]` verifies signature, uses idempotency key (`Notification.dedupeKey` pattern or `SignatureEvent.externalEventId` unique)

E-consent: new row or reuse `ApplicationAcknowledgement` with a `LegalDocument` slug `esign-consent`.

### 7.7 HR vs delivery / PHI

Add additive enum, e.g. `DocumentClassification { HR, CORPORATE, CUSTOMER, OPERATIONS_PHI, OTHER }` (name TBD with counsel).

Rules:

- HR documents may associate only to `Applicant` / `Employee` (never `Delivery`)
- OPERATIONS_PHI / delivery types may associate only to `Delivery` / `Customer` as appropriate
- Dispatcher/driver never in `HR` allow-list
- Employee can see own HR + assigned delivery ops docs (already roughly true) but **cannot** see other employees’ HR
- Do not put specimen labels in the employee HR center

`COMPLIANCE` category types that are really delivery evidence (`CHAIN_OF_CUSTODY`, `SPECIMEN_DOCUMENTATION`, …) should be treated as OPERATIONS_PHI going forward. Keep the enum values; change grouping/ACL, do not delete types.

### 7.8 RLS-style checks

Postgres RLS is **not** required for the first implementation if every query uses shared helpers. Recommended:

1. Extend `documentsListWhere` / `canAccessManagedDocument` with applicant + classification
2. Add `applicationsListWhere(ctx)` and `employeesListWhere(ctx)`
3. Change isolation helpers to **deny by default**
4. Optional later: Postgres RLS policies mirroring those helpers (additive; requires DB role per tenant — heavy on Neon/Vercel). Call this out as phase 4+, not a blocker.

### 7.9 Dashboards

| Role | Cards |
| --- | --- |
| Owner/Admin | Keep existing command center; add applicant-pipeline and expiring-cert widgets; **filter stats by permission** |
| Employee | Required / submitted / pending / approved / rejected / expiring / expired + training |
| Applicant | Application status, missing items, uploads, signatures to sign, messages, submit CTA |

Reuse `StatCard` and `EntityDocumentsSection`.

### 7.10 Logging policy

- Continue `writeAuditLog` for auth, status, download, verify, convert, signature
- Never put file bytes, OCR raw text, SSN, bank, or full form payloads in `metadata` or `console.*`
- Keep `sanitizePublicText` for notification bodies
- Treat `extractionRawText` as restricted; do not surface it to applicants; consider not storing it for HR packets

---

## 8. Files that need modification

Application code should **not** change in this PR. This list is the likely upgrade set.

### 8.1 Schema / seed / RBAC

- `prisma/schema.prisma` — additive models/enums/columns only
- `prisma/seed.ts` — `APPLICANT` role, extra requirements/rules, e-consent legal slug
- `lib/ensure-rbac.ts` — new permissions merge (follow `ensureNewDocumentPermissions` pattern)
- `lib/permissions.ts` — role, home path, portal kind, deny-by-default isolation
- `lib/rbac.ts` — `requirePortal("applicant")`

### 8.2 Auth / account provisioning

- `lib/auth.ts` — allow applicant sign-up path or staff-issued invite only (product choice)
- `lib/portal-account.ts` — generalize provision
- `lib/activation.ts` — applicant email copy
- `lib/account-status.ts` — if applicant-specific statuses are needed (prefer reuse)
- `proxy.ts` + `lib/app-url.ts` — protect `/applicant`
- `app/robots.ts` — disallow `/applicant`

### 8.3 Careers / applications

- `app/api/careers/applications/route.ts` — optional auth, DRAFT, rate-limit GET
- `lib/application-schema.ts` — draft vs submit schemas; keep forbidden keys
- `components/careers/ApplicationForm.tsx` — remove localStorage persist; call authenticated save
- `lib/careers-content.ts` — new public labels
- `app/(portal)/dashboard/applicants/actions.ts` — transition guards + conversion
- `app/(portal)/dashboard/applicants/page.tsx` + `[applicationId]/page.tsx` — new statuses, documents, re-request

### 8.4 Documents

- `lib/documents/access.ts` — `applicantLinks`, classification, forbid HR↔delivery association
- `lib/documents/persist.ts` / `operations.ts` / `upload.ts` / `query.ts` / `buckets.ts` / `catalog.ts` / `groups.ts` / `paths.ts` / `display.ts`
- `lib/documents/compliance-gate.ts` / `qualifying-document.ts` — applicant applicability
- `app/api/portal/documents/route.ts` — applicant upload permission
- `app/(portal)/dashboard/documents/actions.ts` — association kinds
- `app/(portal)/dashboard/documents/alerts/page.tsx` — scope notifications
- `lib/documents/alert-stats.ts` / `lib/dashboard-stats.ts` — permission-aware counts

### 8.5 Employees / compliance / notifications

- `app/(portal)/dashboard/employees/actions.ts` — `employees.create`; conversion helpers
- `app/(portal)/dashboard/employees/[employeeId]/page.tsx` — certifications UI; gate sensitive fields
- `app/(portal)/employee/dashboard/page.tsx` — full document center + upload
- `app/(portal)/dashboard/compliance/actions.ts` — derive-from-documents; requirement admin
- `app/(portal)/dashboard/compliance/page.tsx`
- `lib/documents/notification-scheduler.ts` + `notification-config.ts` + `notification-recipients.ts` + `notification-copy.ts`
- `app/(portal)/dashboard/page.tsx` + `admin/dashboard/page.tsx` — new cards, scoped stats
- `components/portal/PortalSidebar.tsx` — only if staff nav needs “Applicant portal” tools (prefer existing Applicants item)

### 8.6 Contracts (e-sign shared kernel only)

- `app/(portal)/dashboard/contracts/actions.ts` — later, once `SignatureProvider` exists; not required for applicant MVP if envelopes are generic

### 8.7 Tests

- Extend `tests/rbac.test.ts`, `tests/authorization.test.ts`, `tests/applications.test.ts`, `tests/schema-guards.test.ts`
- Extend `tests/documents-phase2.test.ts` (applicant + HR classification IDOR)
- New files listed in §9

### 8.8 Docs (after implementation, not this audit)

- `docs/ACCOUNT-RBAC-REPORT.md`, `docs/MIGRATIONS.md`, `docs/IMPLEMENTATION-REPORT.md` (mark historical)

---

## 9. New files required

Suggested paths. Names can change; responsibilities should not.

### 9.1 Applicant portal

- `app/(portal)/applicant/layout.tsx` — `requirePortal("applicant")`
- `app/(portal)/applicant/dashboard/page.tsx`
- `app/(portal)/applicant/applications/[applicationId]/page.tsx`
- `app/(portal)/applicant/applications/actions.ts` — save, submit, upload, withdraw
- `components/portal/ApplicantStatusCards.tsx`
- `components/portal/MissingRequirementsList.tsx`

### 9.2 Conversion / requirements

- `lib/applicants/conversion.ts` — transactional hire conversion
- `lib/applicants/access.ts` — `applicationsListWhere`, `canAccessApplication`
- `lib/applicants/requirements.ts` — missing/required computation
- `lib/applicants/status.ts` — allowed transitions

### 9.3 Signatures

- `lib/signatures/types.ts` — states, provider interface
- `lib/signatures/provider.ts` — factory
- `lib/signatures/mock.ts` — in-process mock (default)
- `lib/signatures/docusign.ts` — adapter **stub**, no live calls
- `lib/signatures/dropbox-sign.ts` — adapter **stub**, no live calls
- `lib/signatures/consent.ts` — e-consent persistence
- `lib/signatures/webhooks.ts` — verify + idempotency
- `app/api/signatures/webhooks/[provider]/route.ts`
- `app/(portal)/dashboard/signatures/` (staff queue) — optional phase
- `components/portal/SignatureStatusBadge.tsx`

### 9.4 Security hooks

- `lib/documents/malware-scan.ts` — `scanDocument(bytes) => { status: "skipped" | "clean" | "pending" | "blocked" }` no-op default
- `lib/documents/classification.ts` — allowed associations per classification

### 9.5 Tests (product brief)

- `tests/applicant-portal-authz.test.ts`
- `tests/applicant-employee-conversion.test.ts`
- `tests/document-duplicates.test.ts` (HTTP/action-level)
- `tests/document-expiration.test.ts`
- `tests/signature-webhook-idempotency.test.ts`
- `tests/signature-webhook-forgery.test.ts`
- `tests/signed-document-immutability.test.ts`
- `tests/hr-phi-isolation.test.ts`

### 9.6 Migration

- `prisma/migrations/<timestamp>_applicant_compliance_portal/migration.sql` — **additive only** (created in a later implementation PR, not this one)

Do **not** add a new Prisma schema file or a second `package.json` app.

---

## 10. Migration plan (additive only — never drop tables/columns)

All steps are `prisma migrate dev` locally / `prisma migrate deploy` in production. No `migrate reset`. No column/table drops. No enum value removals.

### 10.1 Additive columns

| Table | Column | Purpose |
| --- | --- | --- |
| `Applicant` | `userId String? @unique` | Portal account |
| `ManagedDocument` | `classification` (new enum, default `OTHER` or infer from category) | HR vs OPS |
| `ManagedDocument` | `malwareScanStatus` / `malwareScannedAt` | Scan hook |
| `ManagedDocument` | `immutable Boolean @default(false)` | Signed package lock |
| `Application` | keep `resumeFileKey`; optionally `submittedByUserId` | Trace |
| `Employee` | no drop of `encryptedSsn` | Future restricted collection |
| `Contract` | keep `esignProvider` / `esignEnvelopeId` | Back-compat; new envelopes live elsewhere |

### 10.2 Additive enum values (PostgreSQL `ADD VALUE`)

`ApplicationStatus`: `DOCUMENTS_REQUIRED`, optionally `COMPLIANCE_REVIEW` (keep `BACKGROUND_SCREENING`, `ONBOARDING`, `NOT_SELECTED`).

`NotificationType`: e.g. `SIGNATURE_REQUESTED`, `DOCUMENT_REREQUESTED`, `APPLICATION_CONVERTED`.

`Role` keys are already `TEXT` — insert `APPLICANT` in seed/ensure-rbac, no enum migration needed (role key was migrated off enum in `0002_account_rbac_upgrade`).

New enum `DocumentClassification`, `SignatureEnvelopeStatus`, `MalwareScanStatus` — **create**, do not reuse `DocumentStatus` for signatures.

### 10.3 New tables (suggested)

```
ApplicationRequirement
  id, applicationId, requirementKey / documentType, status,
  requestedAt, requestedBy, satisfiedDocumentId?

SignatureEnvelope
  id, provider, providerEnvelopeId?, status,
  subjectType (application|employee|contract), subjectId,
  legalDocumentId?, consentId?,
  createdBy, sentAt, viewedAt, completedAt, expiresAt

SignatureSigner
  id, envelopeId, userId?, email, role, status, signedAt

SignatureEvent
  id, envelopeId, type, externalEventId? @unique, payloadDigest,
  createdAt

SignatureConsent
  id, userId, legalDocumentId, acceptedAt, ip, userAgent
```

Indexes: `applicationId`, `userId`, `providerEnvelopeId`, `externalEventId`, `contentSha256` (already on documents).

### 10.4 Data backfill (expand-only)

- Set `ManagedDocument.classification` from `category` + `documentType` (map specimen/POD → `OPERATIONS_PHI`, employee/applicant/training/tax → `HR`)
- Do not rewrite `blobKey`s
- Do not delete DRAFT-less historical applications
- Seed `APPLICANT` role and new permissions **without** resetting existing `RolePermission` rows (`ensure-rbac` already merges carefully)

### 10.5 Forbidden

- Dropping `ApplicantDocument`, `resumeFileKey`, `DocumentStatus`, old `ApplicationStatus` values
- Moving files between Blob keys during conversion
- `TRUNCATE` / `migrate reset` on production
- Collecting SSN/bank/medical on `Application`

### 10.6 Deploy order (when implementing)

1. Additive migration + `prisma generate`
2. Seed/ensure-rbac
3. Deploy app that **reads** new columns with defaults
4. Then enable applicant routes
5. Enable mock signatures
6. Only later: provider env flags

---

## 11. Implementation phases

Do not start these in this PR. Suggested order minimizes risk to the live marketing site and existing staff portal.

### Phase 0 — Guardrails (this audit)

- Land this document
- Agree: reuse `ManagedDocument`, no new app, no paid e-sign calls, no SSN on apply
- Confirm production Blob + `CRON_SECRET` + Resend are configured (`docs/PRODUCTION-DEPLOYMENT.md`)

### Phase 1 — Applicant identity + save/resume

- `APPLICANT` role, `Applicant.userId`, `/applicant/*`, activation
- Server DRAFT save/resume; rate-limit status GET
- Remove localStorage persist
- Tests: applicant cannot access `/dashboard`, other applications, or staff document IDs (404)

### Phase 2 — Applicant documents + missing requirements + re-request

- Wire `ApplicantDocument` through upload/ACL
- Classification + **block HR↔delivery association**
- Missing-requirements UI (applicant + staff)
- Staff re-request + notifications
- Tests: duplicates, IDOR, MIME, SHA-256

### Phase 3 — Recruiting status machine + conversion

- Additive statuses + transition map
- `convertApplicationToEmployee` relinks docs/acks/envelopes
- Employee document center cards + employee upload
- Tests: conversion idempotency, document identity preserved (`documentId` + `contentSha256`)

### Phase 4 — Certification / compliance sync + reminders

- Seed OSHA / HazMat / MVR / custom rules
- Derive `ComplianceRecord` from verified docs; keep manual override
- Activate `EmployeeCertification` UI
- Extend scheduler; permission-scope dashboard stats + alerts notifications
- Tests: expiration windows, dedupe (extend phase 5 tests)

### Phase 5 — E-sign (mock) + webhooks

- `SignatureProvider` + mock
- Draft→…→Completed UI + e-consent
- Webhook route with HMAC + `externalEventId` unique
- Immutability flag on completed signed files
- Stub DocuSign/Dropbox Sign modules **without** live credentials
- Tests: webhook idempotency, forged webhook rejected, signed doc cannot have metadata/file replaced

### Phase 6 — Hardening

- `employees.sensitive.view` actually enforced
- Malware-scan hook (no-op + interface)
- Optional signed URLs **only** after ACL, TTL ≤ 60–300s, never persisted
- Decide on Postgres RLS (likely still app-level)
- Attorney/HR review of legal copy (`LegalDocument.reviewNotes` already flags this)
- Do not enable `DOCUMENT_EXTRACTION_PROVIDER=azure` on HR packets without a review of `extractionRawText` retention

---

## Appendix A — Target vs current checklist

| Target | Exists? | Primary evidence |
| --- | --- | --- |
| Applicant account | No | No `APPLICANT` role; `Applicant` has no `userId` |
| Application save/resume | Partial | DRAFT enum + localStorage only |
| Applicant uploads | No | `ApplicantDocument` unused |
| Missing requirements | Partial | Employee/scheduler only |
| E-sign + e-consent | No (ack checkboxes only) | `Contract.esign*` comments |
| Submit + status | Partial | Public submit + staff status |
| Re-requests | No | — |
| Conversion preserving docs/signatures/audit | Partial | Hire creates employee; no doc relink |
| Employee document center | Partial | Buckets, no upload, no required list |
| Role isolation | Partial | Document ACL yes; stats/alerts/association leaks |
| Cert tracking + reminders | Partial | Manual records + doc scheduler |
| SignatureProvider | No | — |
| Envelope state machine | No | — |
| Private storage + no public Blob URLs | Yes | `lib/storage.ts`, file route |
| Short-lived signed URLs | Helper only | `signedUrlTtlSeconds` unused |
| Server-side authz | Yes | `lib/rbac.ts` |
| RLS-style checks | Partial | App WHERE, no DB RLS |
| Upload limits / MIME / sanitize / SHA-256 / duplicates | Yes | `validate.ts`, `upload.ts` |
| Malware-scan hook | No | — |
| Audit log | Yes | `AuditLog` |
| Prevent IDOR | Partial | Strong on current doc roles; applicant/association gaps |
| No SSN/bank/medical on apply | Yes | schema + form tests |
| HR ≠ delivery/PHI | Partial | Association ACL; no classification lock |
| Owner/Admin/Employee cards | Partial | No applicant cards |
| Admin recruiting workflow + history | Partial | History yes; statuses/transitions incomplete |
| Brief tests | Partial | See §2.9 / §4.7 |

## Appendix B — Unknowns (honest)

1. **Production data volume and whether Blob/cron/Resend are live** — not verified from this workspace. `.env.example` documents the variables; this audit did not connect to production.
2. **Whether Next 16 in the deployed build loads `proxy.ts` as middleware** — docs and repo assume yes; `node_modules` was not used here to inspect `generate-agent-files.js` runtime wiring.
3. **Whether Azure Document Intelligence is enabled** — env defaults to off; treat as optional and unsafe for HR raw text until reviewed.
4. **Attorney/HR review of `lib/legal-copy.ts`** — still flagged in schema comments; not a software blocker but a production-hiring blocker.
5. **`NotificationPreference`** appears in the old implementation report and **does not exist** in the schema. Preferences are `SystemSetting` JSON (`notifications`, `documentNotifications`).
6. **Owner of custom roles in production** — seed will not overwrite permission checkboxes; new permissions must be merged explicitly.
7. **Multi-role users** — `homePathForRoles` first-match (OWNER wins). An applicant who is later hired should not remain stuck on `/applicant/dashboard` if `EMPLOYEE` is also present; define order when implementing.
8. **Customer/delivery PHI legal boundary** — engineering can separate ACL; whether specimen paperwork is PHI for this operator is a counsel question. The code today does not treat it as a separate vault.

## Appendix C — Out of scope for the upgrade (do not pull in)

- Rewriting the marketing site
- Replacing Better Auth
- Building a custom cryptographic e-sign engine
- Live DocuSign/Dropbox Sign billing in the first phases
- Auto-transmit Ohio new-hire reports
- Collecting SSN/banking/medical on the public application
- Native mobile apps (`GET /api/portal/me` is enough later)
- Dropping the public tracking-number lookup on day one (rate-limit it; keep as fallback)

---

*End of audit. Implementation should proceed only after this document is reviewed. The PR that carries this file must not include application or migration changes.*
