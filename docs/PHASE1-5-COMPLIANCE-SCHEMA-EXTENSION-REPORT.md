# Phase 1.5 Compliance Schema Extension Report

**Branch:** `cursor/safeway-phase1-applicant-compliance`  
**PR:** https://github.com/Jordyjor23/safeway-medical-couriers/pull/3  
**Constraint:** Additive only. No merge. No production deploy. No production migrations from this agent. No Master Compliance Manual binary in Git. No fake Blob copies. No fake legal e-sign.

---

## 1. Schema

Existing `CompanyDocument` (1:1 with `ManagedDocument`) is unchanged as the uploaded master-file metadata.

New `ControlledDocument` is the business register. Official Rev 1.0 sources are **three files** (hashes in `lib/compliance/register-catalog.ts`):

- Master DOCX → SC-MCM-001 incorporated sections share one ManagedDocument
- Emergency DOCX → SC-ERP-001 prefers this standalone file
- Forms PDF → SC-FRM-001…020 share one ManagedDocument

Seed/templates are `PENDING_SOURCE`, `active: false`, with no ManagedDocument until those uploads. This agent did not upload binaries to Blob and did not commit the ZIP.

New `ComplianceImplementationTask` and `ServiceAuthorization` store OPEN templates and the approved service-scope matrix. Seed does not mark them production-active.

`CompanyDocumentAssignment.controlledDocumentId` allows section-level assignment (SC-OPS-001 / SC-ECP-001) without assigning the entire master. Acknowledgments store `controlledDocumentId`, `controlledDocumentKey`, and `controlledDocumentRevision`.

---

## 2. Migration name

`20260914040000_phase1_5_compliance_schema_extension`

Additive SQL only: new enums/tables/columns/indexes. No `DROP TABLE`, no `DROP COLUMN`, no truncate/reset. `CompanyDocumentAcknowledgment.companyDocumentId` is nullable so section acknowledgments do not collide on the existing `(userId, companyDocumentId)` unique.

This agent did **not** run `prisma migrate deploy` against production.

---

## 3. Enums

**Added to `CompanyLibraryCategory` (existing values kept):**  
`CORPORATE_GOVERNANCE`, `FORMS_RECORDS`, `DOCUMENT_CONTROL`, `UN3373`, `MEDICAL_COURIER_OPERATIONS`

**Added to `CompanyAssignmentAction` (existing values kept):**  
`TRAINING_REQUIRED`, `COMPETENCY_REQUIRED`, `ROLE_AUTHORIZATION`, `REFERENCE_ONLY`  
`SIGN` remains a future e-sign action only.

**New:**  
- `ControlledDocumentStatus`: `PENDING_SOURCE`, `DRAFT`, `ACTIVE`, `SUPERSEDED`, `ARCHIVED`  
- `ControlledDocumentType`: `MANUAL`, `PROGRAM`, `SOP`, `POLICY`, `FORM`, `TEMPLATE`, `PLAN`  
- `ImplementationTaskStatus`: `OPEN`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `WAIVED`, `CANCELED`  
- `ServiceAuthorizationStatus`: `AUTHORIZED`, `AUTHORIZED_AFTER_ROLE_TRAINING`, `AUTHORIZED_WITH_WRITTEN_CLIENT_PROTOCOL`, `AUTHORIZED_AFTER_APPLICABLE_TRAINING`, `CONDITIONAL`, `DEFERRED`, `PROHIBITED`, `REJECT_HOLD`

---

## 4. Models

| Model | Role |
| --- | --- |
| `ControlledDocument` | Register ID (SC-OPS-001, etc.), title, parent CompanyDocument, shared ManagedDocument, category, type, revision, dates, status, section/page, owner role, approval authority, active, supersedes, metadata |
| `ComplianceImplementationTask` | OPEN templates; explicit Owner/Admin complete only |
| `ServiceAuthorization` | Service code/name/status/activation rule; inactive until owner activation |
| `CompanyDocumentAssignment` | Optional `controlledDocumentId` for section assignment |
| `CompanyDocumentAcknowledgment` | Optional controlled ID / key / revision |

---

## 5. Assignment changes

Assignments may target a whole `CompanyDocument` **or** a `ControlledDocument` section. Employees assigned SC-OPS-001 acknowledge that controlled ID/revision, not the entire SC-MCM-001 manual. The file they open is the shared master ManagedDocument (no extra Blob). Unassigned sections stay hidden. Employees cannot edit controlled metadata.

---

## 6. UI

Owner/Admin (Compliance Admin read) surfaces:

| Route | Content |
| --- | --- |
| `/dashboard/compliance/library` | Official 3-file upload checklist; private upload; SHA-256 match; link to register |
| `/dashboard/compliance/register` | Controlled register IDs, revision, dates, status, parent source |
| `/dashboard/compliance/register/[id]` | Detail, assignments, acknowledgments, linked tasks, activate only after source exists |
| `/dashboard/compliance/forms` | SC-FRM-001–020 register + uploaded form files |
| `/dashboard/compliance/tasks` | Implementation tasks (explicit complete) |
| `/dashboard/compliance/matrix` | Service authorization matrix |
| `/employee/company-documents/controlled/[id]` | Assigned section only |

---

## 7. Tests / results

See `tests/phase1-5-compliance-schema.test.ts`.

Covered: shared ManagedDocument, no duplicate Blob on section assign, exact controlled revision on ack, OPEN until explicit complete, matrix statuses preserved, prohibited/deferred not generally available, employees cannot edit metadata, employees only see assigned sections, superseded IDs keep prior ack history, official SHA-256 mapping for the three source files, master does not bind ERP/forms.

- **Vitest:** 222 passed (21 files)
- **Lint:** 0 errors (4 pre-existing warnings)
- **Typecheck:** pass
- **Production `npx next build`:** pass
- Playwright is not present in this repo

---

## 8. Build

`npx prisma generate` then `npx next build` (not `npm run build`, which would run `migrate deploy`). Playwright is not in this repository. Production build passed on this revision.

---

## 9. Preview ready for manual upload?

**Yes — three official files.** Preview is ready for the owner to upload into `/dashboard/compliance/library` from a machine that already has non-production Blob/DB credentials. This cloud VM did **not** upload to Blob and did **not** request production secrets.

### Owner upload checklist

| # | File (do not commit) | SHA-256 | Size | Purpose / category | Maps to | After upload |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `Safeway_Couriers_MASTER_Compliance_Operations_Manual_SC-MCM-001_Rev1.0_FINAL_QA.docx` | `3f2950685ef3fa9f38731620d081795d34b20a0c88d1d4728bf70689aa9cceb7` | 168806 | REFERENCE / GENERAL_COMPLIANCE | SC-MCM-001, SC-ECP-001, SC-HIP-001, SC-BAA-001, SC-HMR-001, SC-UN3373-001, SC-OPS-001, SC-SPEC-001 | DRAFT, inactive, hash-verified; do not activate until owner approval + effective date |
| 2 | `Safeway_Couriers_Emergency_Incident_Program.docx` | `aef57209062a65ea90caf7f6f495a9a02c567a7078fa03025436d206a2eb11cc` | 50245 | SOP / EMERGENCY | SC-ERP-001 only (preferred standalone source) | DRAFT; READ_AND_ACKNOWLEDGE only after owner approval; not an e-signature |
| 3 | `Safeway_Couriers_Forms_and_Records_Package.pdf` | `0c7303fa05c8265c9f2b45bce1b3f2857cc08ef37b90a2a7704c3bd6edb4b622` | 614649 | FORM / FORMS_RECORDS | SC-FRM-001 through SC-FRM-020 share this PDF | DRAFT; templates only, no forms engine |

Detection uses SHA-256 first, then filename / document number / explicit package selector. Keep private. Preserve versioning and hashes. Do not publish or activate until owner approval fields are complete.

---

## 10. Known limitations

- Register/tasks/matrix appear in a database only after `prisma db seed` (or equivalent) on an environment that has applied the new migration.
- Service matrix rows follow the owner brief’s listed programs, forms, and implementation-task constraints. Re-seed does not overwrite an existing status.
- `SIGN` / owner approval task is not a legal e-signature.
- No forms engine; forms are register metadata plus the shared official Forms PDF after upload.
- Official binaries were not present on this cloud VM and were not uploaded; hashes are in code for later verification.
