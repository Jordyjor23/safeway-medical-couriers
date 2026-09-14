# Phase 1.5 Compliance Schema Extension Report

**Branch:** `cursor/safeway-phase1-applicant-compliance`  
**PR:** https://github.com/Jordyjor23/safeway-medical-couriers/pull/3  
**Constraint:** Additive only. No merge. No production deploy. No production migrations from this agent. No Master Compliance Manual binary in Git. No fake Blob copies. No fake legal e-sign.

---

## 1. Schema

Existing `CompanyDocument` (1:1 with `ManagedDocument`) is unchanged as the uploaded master-file metadata.

New `ControlledDocument` is the business register. Many controlled records may share one `sourceManagedDocumentId` (the uploaded SC-MCM-001 file). Seed/templates are `PENDING_SOURCE`, `active: false`, with no ManagedDocument until the owner uploads the master.

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
| `/dashboard/compliance/library` | Master source files; upload; attach as SC-MCM-001 |
| `/dashboard/compliance/register` | Controlled register IDs, revision, dates, status, parent source |
| `/dashboard/compliance/register/[id]` | Detail, assignments, acknowledgments, linked tasks, activate only after source exists |
| `/dashboard/compliance/forms` | SC-FRM-001–020 register + uploaded form files |
| `/dashboard/compliance/tasks` | Implementation tasks (explicit complete) |
| `/dashboard/compliance/matrix` | Service authorization matrix |
| `/employee/company-documents/controlled/[id]` | Assigned section only |

---

## 7. Tests / results

See `tests/phase1-5-compliance-schema.test.ts`.

Covered: shared ManagedDocument, no duplicate Blob on section assign, exact controlled revision on ack, OPEN until explicit complete, matrix statuses preserved, prohibited/deferred not generally available, employees cannot edit metadata, employees only see assigned sections, superseded IDs keep prior ack history.

Verification recorded after this change (see final message for counts).

---

## 8. Build

`npx prisma generate` then `npx next build` (not `npm run build`, which would run `migrate deploy`). Playwright is not in this repository.

---

## 9. Preview ready for manual upload?

**Yes.** Preview is ready for the owner to upload the real SC-MCM-001 Master Compliance Manual into the library (document number `SC-MCM-001` or “Attach as SC-MCM-001 master source”). That links all pending register rows to the **same** ManagedDocument, still **DRAFT / inactive** until the owner explicitly activates a record. The DOCX is not in Git, not fabricated, and was not uploaded by this agent.

---

## 10. Known limitations

- Register/tasks/matrix appear in a database only after `prisma db seed` (or equivalent) on an environment that has applied the new migration.
- Service matrix rows follow the owner brief’s listed programs, forms, and implementation-task constraints. Re-seed does not overwrite an existing status.
- `SIGN` / owner approval task is not a legal e-signature.
- No forms engine; forms are register metadata plus optional uploaded files.
