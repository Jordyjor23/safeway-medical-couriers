# Phase 1.5 Operational Content & Admin Document Library

**Branch:** `cursor/safeway-phase1-applicant-compliance`  
**PR:** https://github.com/Jordyjor23/safeway-medical-couriers/pull/3  
**Constraint:** Extend Phase 1 in place. No merge. No production deploy. No fabricated Safeway PDFs in Git or `/public`.

---

## 1. Existing functionality reused

- `ManagedDocument` + private Vercel Blob (`storePrivateFile`)
- MIME/size/filename validation, SHA-256, malware fail-safe (`UNSCANNED` ≠ verified safe)
- Document ACL (`canAccessManagedDocument`), signed/private file routes
- Supersede/archive lifecycle (new blob, prior version retained)
- `ComplianceRequirement` / `RequirementAssignment` / `DocumentRequirementRule`
- Job admin (`JobOpening`, `JobStatus` already included DRAFT/PUBLISHED/PAUSED/CLOSED/ARCHIVED)
- Applicant apply-time assignment (`assignDefaultApplicantRequirements`)
- Employee credential buckets (`employeeDocumentBuckets`)
- Phase 1 RBAC (Owner/Admin write for the company library; custom roles still cannot receive Phase 1 restricted ATS/HR keys)

No parallel document store was added. Company files are `ManagedDocument` rows with `CompanyDocument` metadata.

---

## 2. New admin functionality

| Surface | Route | Who |
| --- | --- | --- |
| Company compliance library | `/dashboard/compliance/library` | Owner/Admin write; Compliance Admin read |
| Library detail / versions / assignments | `/dashboard/compliance/library/[id]` | same |
| Forms / templates | `/dashboard/compliance/forms` | same |
| Compliance dashboard cards | `/dashboard/compliance` | `compliance.view` |
| Job posting admin | `/dashboard/jobs`, `/new`, `/[id]` | existing job permissions |

Owner/Admin workflow: Compliance → Library → Upload (type/category/metadata/version/effective date) → Assign → Activate. Later policy updates are new uploads, not code changes.

The library is **empty** until the owner uploads real files.

---

## 3. Routes added

- `/dashboard/compliance/library`
- `/dashboard/compliance/library/[companyDocumentId]`
- `/dashboard/compliance/forms`
- `/employee/company-documents/[companyDocumentId]`

No public object URLs. Downloads use `/api/portal/documents/[documentId]/file` after ACL.

---

## 4. Schema / migrations

Additive migration: `prisma/migrations/20260914030000_phase1_5_operational_content`

New enums: `CompanyDocumentPurpose`, `CompanyLibraryCategory`, `CompanyPublicationStatus`, `CompanyAssignmentAction`, `CompanyAssignmentAudience`

New tables:

- `CompanyDocument` — title, description, document number, revision, purpose, category, publication status, effective/review dates, responsible role, `familyKey`, unique `documentId` → `ManagedDocument`
- `CompanyDocumentAssignment` — family-scoped assignment (ALL_EMPLOYEES, ALL_DRIVERS, ROLE, EMPLOYEE, APPLICANTS, FUTURE_HIRES, JOB) and actions READ, READ_AND_ACKNOWLEDGE, UPLOAD_CERTIFICATE, COMPLETE_FORM, SIGN
- `CompanyDocumentAcknowledgment` — exact `companyDocumentId`, `documentId`, revision, SHA-256, user/employee, fixed acknowledgment text, IP/user-agent, unique `(userId, companyDocumentId)`

No drops. No document bytes in Git.

---

## 5. Security controls

- Authenticated portal only; Owner/Admin required to upload/replace/activate/assign
- Employees cannot upload or supersede a company master SOP
- Unassigned internal SOPs are hidden from employees, drivers, and applicants
- Drivers reading an assigned SOP do **not** receive HR document ACL
- Applicants see internal SOPs only if explicitly assigned (`APPLICANTS` or `JOB`)
- `FUTURE_HIRES` matches employees only, not applicants
- Private Blob, SHA-256, validation, malware fail-safe, audit events (`company_document.*`)
- Unauthenticated signed-URL issuance still 401
- Acknowledgments are labeled acknowledgments, not e-signatures
- Optional hardening: `rejectManagedDocument` now requires a non-empty rejection reason

---

## 6. Document version model

- A replacement is a **new** `ManagedDocument` + new `CompanyDocument` sharing `familyKey`
- Prior row becomes `SUPERSEDED`; blob key is never overwritten
- Revision increments (`1.0` → `1.1`)
- Assignments stay on `familyKey` so the current ACTIVE version is what assignees read
- Acknowledgments stay on the exact `companyDocumentId`

Publication statuses: `DRAFT`, `ACTIVE`, `SUPERSEDED`, `ARCHIVED`

---

## 7. Acknowledgment model

Fixed text: “I acknowledge that I received and reviewed this document.”

Stored with user, employee, exact document version, SHA-256, timestamp, IP/user-agent when available, and an audit event.

UI disclaimer: this is **not** a DocuSign-equivalent electronic signature. `SIGN` / `SIGNATURE_REQUIRED` exist as future action/type only.

---

## 8. Job posting fixes

Dropdowns now always have option data from `lib/jobs/options.ts`: department, employment type, classification, work arrangement, pay type, shift, status.

- New jobs are always **DRAFT**
- Public careers still query `status: PUBLISHED` only
- Owner can unpublish to DRAFT, publish, pause, close, archive without code edits
- Application questions (one per line) and job-level compliance requirement checkboxes persist as `JobQuestion` / `RequirementAssignment` (`audience: JOB`)
- Compensation fields remain optional; no invented pay language is required

---

## 9. Draft Medical Courier Driver job

`ensureMedicalCourierDriverDraft()` creates **Medical Courier Driver** as **DRAFT** if no posting with that title exists. If a **DRAFT** already exists, it updates that draft with the owner-approved fields, questions, and baseline job requirements. It does **not** overwrite PUBLISHED / PAUSED / CLOSED / ARCHIVED postings.

Owner-approved draft defaults:

- W-2 employee, full-time (`workerClassification: EMPLOYEE`, `employmentType: FULL_TIME`)
- Compensation notes: `$20.00–$23.00/hour depending on experience and qualifications. Approved business mileage reimbursed at $0.76 per mile.`
- Compensation range fields: `$20.00`–`$23.00` hourly (`compensationMin` / `compensationMax`)
- Location: `Columbus, Ohio / Central Ohio service area`
- Vehicle: reliable personal vehicle, valid DL, and current auto insurance; vehicle kept in safe operating condition
- Schedule: full-time; varies by route and may include daytime, evening, overnight, weekend, holiday, and on-call
- Application questions: six required screening questions plus one preferred (not required) experience question
- Job-level apply-time requirements: resume, DL, insurance, HIPAA, BBP, SOP/policy acknowledgments, background authorization, MVR authorization
- HazMat / specialty handling is **not** a universal apply-time requirement; it may be assigned later by route or role
- Called from `prisma/seed.ts` after requirement seed
- **Not published**

If seed has not been run against a database, the function is ready; the draft will appear after `prisma db seed`.

---

## 10. Job → requirement automation

If a job has active `RequirementAssignment` rows with `audience: JOB`, apply-time assignment uses **those** requirement IDs.

If the job has none, Phase 1 defaults still apply.

The public apply UI does not hard-code requirement lists.

---

## 11. Tests / verification

See `tests/phase1-5-operational-content.test.ts`. Phase 1 tests were not weakened.

- **Vitest:** 213 passed (20 files)
- **Lint:** 0 errors (4 pre-existing warnings)
- **Typecheck:** pass
- **Production `npx next build`:** pass
- Playwright is not present in this repo

---

## 12. Environment / dependencies

No new production dependencies. No paid scanners or e-sign SDKs. No new public env vars.

---

## 13. Known limitations

- Library is empty until the owner uploads real Safeway files
- Forms are uploaded templates, not a dynamic form builder
- `SIGN` does not call an e-sign provider
- Company-library write is Owner/Admin only (not custom roles, not employees)
- Postgres RLS remains Phase 1.1 (not this PR)
- Draft job appears only after seed / `ensureMedicalCourierDriverDraft` against a live database
- Employee company-document list is assignment-based; staff still use the library UI

---

## 14. Owner input still needed

1. Upload approved manuals/SOPs/forms into the library (do not commit PDFs to Git)
2. Set effective/review dates, document numbers, and responsible roles
3. Assign each ACTIVE document (who must read / acknowledge / upload a certificate)
4. Review the Medical Courier Driver **draft** (compensation, location, vehicle, and schedule are now owner-approved), then publish only if desired
5. Confirm job-level requirement checkboxes per posting
6. Choose a future e-sign provider if/when Phase 2 starts
