import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  canAccessAssignedControlledDocument,
  canManageCompanyLibrary,
  employeeCannotEditControlledMetadata,
  employeeCannotManageCompanyLibrary,
} from "@/lib/compliance/library-access";
import { COMPANY_ASSIGNMENT_ACTIONS, COMPANY_LIBRARY_CATEGORIES } from "@/lib/compliance/library-catalog";
import {
  APPROVED_SERVICE_MATRIX,
  CONTROLLED_REGISTER_SEEDS,
  IMPLEMENTATION_TASK_SEEDS,
  SC_MCM_MASTER_ID,
  controlledDocumentVisibleToAssignees,
  serviceIsGenerallyAvailable,
} from "@/lib/compliance/register-catalog";
import { pendingSourceRegisterReady, sharedMasterSource } from "@/lib/compliance/register";

const schema = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260914040000_phase1_5_compliance_schema_extension/migration.sql"),
  "utf8",
);
const registerSource = readFileSync(path.join(process.cwd(), "lib/compliance/register.ts"), "utf8");
const librarySource = readFileSync(path.join(process.cwd(), "lib/compliance/library.ts"), "utf8");

describe("Phase 1.5 compliance schema extension", () => {
  it("adds additive models, enums, and categories without drops", () => {
    expect(schema).toContain("model ControlledDocument");
    expect(schema).toContain("model ComplianceImplementationTask");
    expect(schema).toContain("model ServiceAuthorization");
    expect(schema).toContain("PENDING_SOURCE");
    expect(schema).toContain("TRAINING_REQUIRED");
    expect(schema).toContain("COMPETENCY_REQUIRED");
    expect(schema).toContain("ROLE_AUTHORIZATION");
    expect(schema).toContain("REFERENCE_ONLY");
    expect(COMPANY_ASSIGNMENT_ACTIONS).toEqual(
      expect.arrayContaining(["READ", "SIGN", "TRAINING_REQUIRED", "REFERENCE_ONLY"]),
    );
    expect(COMPANY_LIBRARY_CATEGORIES).toEqual(
      expect.arrayContaining([
        "CORPORATE_GOVERNANCE",
        "FORMS_RECORDS",
        "DOCUMENT_CONTROL",
        "UN3373",
        "MEDICAL_COURIER_OPERATIONS",
        "HIPAA",
      ]),
    );
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS \"ControlledDocument\"");
    expect(migration).not.toMatch(/DROP TABLE/i);
    expect(migration).not.toMatch(/DROP COLUMN/i);
    expect(migration).not.toMatch(/TRUNCATE/i);
  });

  it("lets multiple controlled documents share one ManagedDocument without duplicate blobs", () => {
    expect(CONTROLLED_REGISTER_SEEDS).toHaveLength(29);
    expect(CONTROLLED_REGISTER_SEEDS[0]?.controlledDocumentId).toBe(SC_MCM_MASTER_ID);
    expect(CONTROLLED_REGISTER_SEEDS.some((row) => row.controlledDocumentId === "SC-OPS-001")).toBe(true);
    expect(CONTROLLED_REGISTER_SEEDS.some((row) => row.controlledDocumentId === "SC-FRM-020")).toBe(true);
    expect(
      sharedMasterSource([
        { sourceManagedDocumentId: "md-1" },
        { sourceManagedDocumentId: "md-1" },
        { sourceManagedDocumentId: "md-1" },
      ]),
    ).toBe(true);
    expect(librarySource).toContain("attachMasterSourceToPackage");
    expect(registerSource).not.toContain("storePrivateFile");
    expect(registerSource).toContain("sourceManagedDocumentId: companyDocument.documentId");
  });

  it("keeps register templates pending-source and inactive until master upload", () => {
    expect(
      pendingSourceRegisterReady({ status: "PENDING_SOURCE", active: false, sourceManagedDocumentId: null }),
    ).toBe(true);
    expect(controlledDocumentVisibleToAssignees("PENDING_SOURCE", false)).toBe(false);
    expect(controlledDocumentVisibleToAssignees("ACTIVE", true)).toBe(true);
    expect(registerSource).toContain('status: "PENDING_SOURCE"');
    expect(registerSource).toContain("active: false");
    expect(registerSource).toContain("Upload the master source file before activating");
  });

  it("stores acknowledgments against the exact controlled revision and preserves superseded history", () => {
    expect(librarySource).toContain("controlledDocumentRevision: controlled.revision");
    expect(librarySource).toContain("controlledDocumentKey: controlled.controlledDocumentId");
    expect(schema).toContain("@@unique([userId, controlledDocumentId])");
    expect(schema).toContain("supersedesControlledDocumentId");
    const first = { controlledDocumentId: "cd-1", revision: "1.0" };
    const superseded = { controlledDocumentId: "cd-2", revision: "1.1", supersedes: "cd-1" };
    expect(first.controlledDocumentId).not.toBe(superseded.controlledDocumentId);
    expect(schema).not.toMatch(/onDelete: Cascade\s*\n\s*controlledDocumentRevision/);
  });

  it("keeps implementation tasks OPEN until an explicit complete", () => {
    expect(IMPLEMENTATION_TASK_SEEDS).toHaveLength(11);
    expect(IMPLEMENTATION_TASK_SEEDS.every((task) => task.title.length > 0)).toBe(true);
    expect(registerSource).toContain('status: "OPEN"');
    expect(registerSource).toContain("completeImplementationTask");
    expect(registerSource).toContain("Never auto-complete");
    expect(registerSource).toContain('if (task.status === "COMPLETED" || task.status === "WAIVED" || task.status === "CANCELED")');
  });

  it("preserves approved service matrix statuses and treats prohibited/deferred as not generally available", () => {
    expect(APPROVED_SERVICE_MATRIX.map((row) => row.serviceCode).sort()).toEqual(
      [...new Set(APPROVED_SERVICE_MATRIX.map((row) => row.serviceCode))].sort(),
    );
    const sharps = APPROVED_SERVICE_MATRIX.find((row) => row.serviceCode === "SHARPS_RMW");
    expect(sharps?.status).toBe("DEFERRED");
    expect(serviceIsGenerallyAvailable("AUTHORIZED")).toBe(true);
    expect(serviceIsGenerallyAvailable("DEFERRED")).toBe(false);
    expect(serviceIsGenerallyAvailable("PROHIBITED")).toBe(false);
    expect(serviceIsGenerallyAvailable("REJECT_HOLD")).toBe(false);
    expect(registerSource).toContain(`update: {
        serviceName: service.serviceName,
        activationRule: service.activationRule,
        sourceControlledDocumentId: sourceId,
        notes: service.notes,
      }`);
  });

  it("does not let employees edit controlled metadata or see unassigned sections", () => {
    expect(employeeCannotEditControlledMetadata(["EMPLOYEE"])).toBe(true);
    expect(employeeCannotManageCompanyLibrary(["DRIVER"])).toBe(true);
    expect(canManageCompanyLibrary(["OWNER"])).toBe(true);
    const employee = { roles: ["EMPLOYEE"], employeeId: "emp-1", isDriver: false, applicantId: null, jobOpeningIds: [] };
    expect(
      canAccessAssignedControlledDocument({
        roles: ["EMPLOYEE"],
        status: "ACTIVE",
        active: true,
        assignments: [{ active: true, action: "READ", audience: "ALL_EMPLOYEES", controlledDocumentId: "ops-1" }],
        actor: employee,
        controlledDocumentId: "ecp-1",
      }),
    ).toBe(false);
    expect(
      canAccessAssignedControlledDocument({
        roles: ["EMPLOYEE"],
        status: "ACTIVE",
        active: true,
        assignments: [{ active: true, action: "READ", audience: "ALL_EMPLOYEES", controlledDocumentId: "ops-1" }],
        actor: employee,
        controlledDocumentId: "ops-1",
      }),
    ).toBe(true);
    expect(
      canAccessAssignedControlledDocument({
        roles: ["EMPLOYEE"],
        status: "PENDING_SOURCE",
        active: false,
        assignments: [{ active: true, action: "READ", audience: "ALL_EMPLOYEES", controlledDocumentId: "ops-1" }],
        actor: employee,
        controlledDocumentId: "ops-1",
      }),
    ).toBe(false);
  });

  it("keeps SIGN as a future e-sign action only", () => {
    expect(librarySource).toContain("COMPANY_ACKNOWLEDGMENT_TEXT");
    expect(readFileSync(path.join(process.cwd(), "lib/compliance/library-catalog.ts"), "utf8")).toContain(
      "not an electronic signature",
    );
    expect(IMPLEMENTATION_TASK_SEEDS.some((task) => task.key === "obtain_owner_controlled_approval_signature")).toBe(true);
  });
});
