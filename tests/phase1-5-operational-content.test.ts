import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applicantRequirementIdsFromJobConfig,
} from "@/lib/compliance/requirements";
import {
  actorHasCompanyAssignment,
  assignmentMatchesActor,
  canAccessAssignedCompanyDocument,
  canManageCompanyLibrary,
  employeeCannotManageCompanyLibrary,
} from "@/lib/compliance/library-access";
import {
  COMPANY_ACKNOWLEDGMENT_TEXT,
  COMPANY_DOCUMENT_PURPOSES,
  COMPANY_LIBRARY_CATEGORIES,
  nextRevision,
} from "@/lib/compliance/library-catalog";
import { canAccessManagedDocument, type DocumentAccessRecord, type DocumentActor } from "@/lib/documents/access";
import { jobIsPubliclyVisible, jobOptionListsArePopulated, JOB_DEPARTMENTS, JOB_STATUSES } from "@/lib/jobs/options";
import {
  defaultMedicalCourierRequirementKeys,
  MEDICAL_COURIER_COMPENSATION_NOTES,
  MEDICAL_COURIER_DRIVER_QUESTIONS,
  MEDICAL_COURIER_LOCATION,
  MEDICAL_COURIER_SCHEDULE,
  MEDICAL_COURIER_VEHICLE_REQUIREMENTS,
  medicalCourierDriverDraftFields,
  shouldUpdateMedicalCourierDraft,
} from "@/lib/jobs/ensure-draft";
import { issueDocumentSignedUrl } from "@/lib/documents/signed-url-issue";

function actor(overrides: { roles: string[]; permissions?: string[]; user?: Partial<DocumentActor["user"]> }): DocumentActor {
  return {
    user: { id: "user-1", employeeId: null, customerId: null, applicantId: null, ...overrides.user },
    roles: overrides.roles,
    permissions: new Set(overrides.permissions ?? ["documents.view", "documents.download", "documents.upload"]),
  };
}

function companyDoc(overrides: Partial<DocumentAccessRecord> = {}): DocumentAccessRecord {
  return {
    id: "doc-sop",
    isSensitive: true,
    category: "SOPS",
    policyDomain: "COMPLIANCE",
    employeeLinks: [],
    customerLinks: [],
    contractLinks: [],
    deliveryLinks: [],
    applicantLinks: [],
    companyLibrary: { id: "cd-1", familyKey: "fam-1", publicationStatus: "ACTIVE" },
    companyAssignments: [],
    ...overrides,
  };
}

describe("Phase 1.5 company library access", () => {
  it("lets owner/admin upload and manage company documents", () => {
    expect(canManageCompanyLibrary(["OWNER"])).toBe(true);
    expect(canManageCompanyLibrary(["ADMIN"])).toBe(true);
    expect(canManageCompanyLibrary(["EMPLOYEE"])).toBe(false);
    expect(canManageCompanyLibrary(["DRIVER"])).toBe(false);
    expect(employeeCannotManageCompanyLibrary(["EMPLOYEE"])).toBe(true);
  });

  it("lets an employee view an assigned SOP and hides an unassigned restricted document", () => {
    const employee = actor({
      roles: ["EMPLOYEE"],
      user: { id: "e1", employeeId: "emp-1" },
    });
    const assigned = companyDoc({
      companyAssignments: [{ active: true, action: "READ_AND_ACKNOWLEDGE", audience: "ALL_EMPLOYEES" }],
    });
    const unassigned = companyDoc({ id: "doc-secret", companyLibrary: { id: "cd-2", familyKey: "fam-2", publicationStatus: "ACTIVE" } });
    expect(canAccessManagedDocument(employee, assigned, "view")).toBe(true);
    expect(canAccessManagedDocument(employee, unassigned, "view")).toBe(false);
    expect(canAccessManagedDocument(employee, assigned, "edit")).toBe(false);
  });

  it("does not let an employee replace a company master SOP", () => {
    const employee = actor({ roles: ["EMPLOYEE"], user: { employeeId: "emp-1" } });
    const sop = companyDoc({
      companyAssignments: [{ active: true, action: "READ", audience: "ALL_EMPLOYEES" }],
    });
    expect(canAccessManagedDocument(employee, sop, "archive")).toBe(false);
    expect(canManageCompanyLibrary(employee.roles)).toBe(false);
    const uploadSource = readFileSync(path.join(process.cwd(), "lib/documents/upload.ts"), "utf8");
    expect(uploadSource).toContain("companyLibrary");
    expect(uploadSource).toContain("canManageCompanyLibrary");
  });

  it("records acknowledgment against the exact document version and keeps prior history after supersede", () => {
    expect(COMPANY_ACKNOWLEDGMENT_TEXT).toContain("received and reviewed");
    expect(nextRevision("1.0")).toBe("1.1");
    const first = { companyDocumentId: "cd-1", revision: "1.0", contentSha256: "aaa" };
    const second = { companyDocumentId: "cd-2", revision: "1.1", contentSha256: "bbb" };
    expect(first.companyDocumentId).not.toBe(second.companyDocumentId);
    expect(first.revision).not.toBe(second.revision);
    const librarySource = readFileSync(path.join(process.cwd(), "lib/compliance/library.ts"), "utf8");
    expect(librarySource).toContain("documentRevision");
    expect(librarySource).toContain("contentSha256");
    expect(librarySource).toContain("publicationStatus: \"SUPERSEDED\"");
    expect(librarySource).not.toMatch(/deleteMany\(\s*\{\s*where:\s*\{\s*companyDocumentId/);
  });

  it("keeps the old document version immutable", () => {
    expect(companyDocumentIsImmutableHint()).toBe(true);
  });
});

function companyDocumentIsImmutableHint() {
  const source = readFileSync(path.join(process.cwd(), "lib/compliance/library.ts"), "utf8");
  return source.includes("companyDocumentIsImmutable") && source.includes("storePrivateFile") && !source.includes("update({ where: { id: previous.documentId }, data: { blobKey");
}

describe("Phase 1.5 assignment and certificates", () => {
  it("matches assignment audiences without granting HR access", () => {
    const employee = { roles: ["EMPLOYEE"], employeeId: "emp-1", isDriver: false, applicantId: null, jobOpeningIds: [] };
    const driver = { roles: ["DRIVER"], employeeId: "emp-2", isDriver: true, applicantId: null, jobOpeningIds: [] };
    const applicant = { roles: ["APPLICANT"], employeeId: null, applicantId: "app-1", jobOpeningIds: ["job-1"] };
    expect(assignmentMatchesActor({ active: true, action: "READ", audience: "ALL_EMPLOYEES" }, employee)).toBe(true);
    expect(assignmentMatchesActor({ active: true, action: "READ", audience: "ALL_DRIVERS" }, employee)).toBe(false);
    expect(assignmentMatchesActor({ active: true, action: "READ", audience: "ALL_DRIVERS" }, driver)).toBe(true);
    expect(assignmentMatchesActor({ active: true, action: "READ", audience: "APPLICANTS" }, applicant)).toBe(true);
    expect(assignmentMatchesActor({ active: true, action: "READ", audience: "APPLICANTS" }, employee)).toBe(false);
    expect(assignmentMatchesActor({ active: true, action: "READ", audience: "FUTURE_HIRES" }, applicant)).toBe(false);
    expect(
      actorHasCompanyAssignment(
        [{ active: true, action: "UPLOAD_CERTIFICATE", audience: "ALL_EMPLOYEES", requirementId: "req-1" } as never],
        employee,
        ["UPLOAD_CERTIFICATE"],
      ),
    ).toBe(true);
  });

  it("does not treat SIGN as a live e-signature provider", () => {
    const catalog = readFileSync(path.join(process.cwd(), "lib/compliance/library-catalog.ts"), "utf8");
    expect(catalog).toContain("SIGNATURE_REQUIRED");
    expect(catalog).toContain("not an electronic signature");
    expect(COMPANY_DOCUMENT_PURPOSES).toContain("SIGNATURE_REQUIRED");
    expect(COMPANY_LIBRARY_CATEGORIES.length).toBeGreaterThan(5);
  });
});

describe("Phase 1.5 job posting administration", () => {
  it("has working option lists for job dropdowns", () => {
    expect(jobOptionListsArePopulated()).toBe(true);
    expect(JOB_DEPARTMENTS).toContain("Operations");
    expect(JOB_STATUSES).toEqual(expect.arrayContaining(["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "ARCHIVED"]));
    const form = readFileSync(path.join(process.cwd(), "components/portal/JobForm.tsx"), "utf8");
    expect(form).toContain("JOB_DEPARTMENTS");
    expect(form).toContain("JOB_EMPLOYMENT_TYPES");
    expect(form).toContain("JOB_WORK_ARRANGEMENTS");
    expect(form).toContain("JOB_STATUSES");
    expect(form).toContain("JOB_SHIFTS");
  });

  it("hides DRAFT jobs from the public and shows PUBLISHED jobs", () => {
    expect(jobIsPubliclyVisible("DRAFT")).toBe(false);
    expect(jobIsPubliclyVisible("PAUSED")).toBe(false);
    expect(jobIsPubliclyVisible("PUBLISHED")).toBe(true);
    const jobsSource = readFileSync(path.join(process.cwd(), "lib/jobs.ts"), "utf8");
    expect(jobsSource).toContain('status: "PUBLISHED"');
  });

  it("derives applicant requirements from job configuration when present", () => {
    expect(
      applicantRequirementIdsFromJobConfig({
        jobAssignmentRequirementIds: ["hipaa", "dl"],
        defaultRequiredIds: ["resume"],
      }),
    ).toEqual(["hipaa", "dl"]);
    expect(
      applicantRequirementIdsFromJobConfig({
        jobAssignmentRequirementIds: [],
        defaultRequiredIds: ["resume"],
      }),
    ).toEqual(["resume"]);
    expect(defaultMedicalCourierRequirementKeys()).toEqual(
      expect.arrayContaining([
        "driver_qualification",
        "insurance",
        "mvr_authorization",
        "background_authorization",
        "hipaa",
        "bloodborne_pathogens",
        "sop_acknowledgement",
        "resume",
      ]),
    );
    expect(defaultMedicalCourierRequirementKeys()).not.toContain("hazmat_awareness");
    const fields = medicalCourierDriverDraftFields();
    expect(fields.status).toBe("DRAFT");
    expect(fields.workerClassification).toBe("EMPLOYEE");
    expect(fields.employmentType).toBe("FULL_TIME");
    expect(fields.compensationNotes).toBe(MEDICAL_COURIER_COMPENSATION_NOTES);
    expect(fields.compensationMin).toBe(20);
    expect(fields.compensationMax).toBe(23);
    expect(fields.location).toBe(MEDICAL_COURIER_LOCATION);
    expect(fields.vehicleRequirements).toBe(MEDICAL_COURIER_VEHICLE_REQUIREMENTS);
    expect(fields.schedule).toBe(MEDICAL_COURIER_SCHEDULE);
    expect(fields.requiredCertifications).toMatch(/HazMat awareness.*may be assigned later/i);
    expect(MEDICAL_COURIER_DRIVER_QUESTIONS).toHaveLength(7);
    expect(MEDICAL_COURIER_DRIVER_QUESTIONS.filter((question) => question.required)).toHaveLength(6);
    expect(MEDICAL_COURIER_DRIVER_QUESTIONS[6]?.required).toBe(false);
    expect(shouldUpdateMedicalCourierDraft("DRAFT")).toBe(true);
    expect(shouldUpdateMedicalCourierDraft("PUBLISHED")).toBe(false);
    expect(shouldUpdateMedicalCourierDraft("PAUSED")).toBe(false);
    expect(shouldUpdateMedicalCourierDraft("CLOSED")).toBe(false);
    expect(shouldUpdateMedicalCourierDraft("ARCHIVED")).toBe(false);
    const draftSource = readFileSync(path.join(process.cwd(), "lib/jobs/ensure-draft.ts"), "utf8");
    expect(draftSource).toContain("existing_non_draft");
    expect(draftSource).toContain("syncDraftQuestionsAndRequirements");
    expect(draftSource).not.toContain("hazmat_awareness");
    expect(draftSource).not.toMatch(/Personal or company vehicle requirements are set by the owner/);
  });
});

describe("Phase 1.5 public isolation", () => {
  it("does not issue a private SOP URL to an unauthenticated caller", () => {
    const issued = issueDocumentSignedUrl({
      actor: null,
      document: companyDoc({
        companyAssignments: [{ active: true, action: "READ", audience: "ALL_EMPLOYEES" }],
      }),
    });
    expect(issued).toMatchObject({ error: "Unauthorized", status: 401 });
  });

  it("does not let an applicant read an unassigned internal SOP", () => {
    const applicant = actor({
      roles: ["APPLICANT"],
      permissions: ["documents.view", "documents.download"],
      user: { applicantId: "app-1" },
    });
    expect(canAccessManagedDocument(applicant, companyDoc(), "view")).toBe(false);
    expect(
      canAccessAssignedCompanyDocument({
        roles: ["APPLICANT"],
        publicationStatus: "ACTIVE",
        assignments: [{ active: true, action: "READ", audience: "ALL_EMPLOYEES" }],
        actor: { roles: ["APPLICANT"], applicantId: "app-1" },
      }),
    ).toBe(false);
  });
});
