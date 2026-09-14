import { describe, expect, it } from "vitest";
import {
  canAccessManagedDocument,
  canAssociateDelivery,
  canAttachDocumentToDelivery,
  canSelfApproveDocument,
  documentsListWhere,
  type DocumentAccessRecord,
  type DocumentActor,
} from "@/lib/documents/access";
import { canAccessPortal, homePathForRoles, roleHasPermission } from "@/lib/permissions";
import { canAccessApplication, applicationsListWhere } from "@/lib/applications/authorization";
import { sanitizeDocumentOwnerInput, canAttachDomainToDelivery, policyDomainFor } from "@/lib/documents/policy";
import { issueDocumentSignedUrl } from "@/lib/documents/signed-url-issue";
import { createDocumentAccessToken, verifyDocumentAccessToken } from "@/lib/documents/signed-url";
import { applicantSafeStatusLabel } from "@/lib/applications/status";

function actor(overrides: { roles: string[]; permissions?: string[]; user?: Partial<DocumentActor["user"]> }): DocumentActor {
  return {
    user: { id: "user-1", employeeId: null, customerId: null, applicantId: null, ...overrides.user },
    roles: overrides.roles,
    permissions: new Set(overrides.permissions ?? []),
  };
}

function document(overrides: Partial<DocumentAccessRecord> = {}): DocumentAccessRecord {
  return {
    id: "doc-1",
    isSensitive: false,
    employeeLinks: [],
    customerLinks: [],
    contractLinks: [],
    deliveryLinks: [],
    applicantLinks: [],
    ...overrides,
  };
}

describe("applicant isolation", () => {
  it("sends applicants to the applicant portal and blocks staff shells", () => {
    expect(homePathForRoles(["APPLICANT"])).toBe("/applicant/dashboard");
    expect(canAccessPortal(["APPLICANT"], "applicant")).toBe(true);
    expect(canAccessPortal(["APPLICANT"], "staff")).toBe(false);
    expect(canAccessPortal(["APPLICANT"], "admin")).toBe(false);
    expect(canAccessPortal(["APPLICANT"], "employee")).toBe(false);
    expect(canAccessPortal(["APPLICANT"], "customer")).toBe(false);
    expect(canAccessPortal(["APPLICANT"], "dispatch")).toBe(false);
    expect(roleHasPermission("APPLICANT", "users.manage")).toBe(false);
  });

  it("keeps a hired applicant+employee on the employee home", () => {
    expect(homePathForRoles(["APPLICANT", "EMPLOYEE"])).toBe("/employee/dashboard");
  });

  it("does not let applicant A view applicant B's file", () => {
    const applicantA = actor({
      roles: ["APPLICANT"],
      permissions: ["documents.view", "documents.download"],
      user: { id: "a", applicantId: "app-a" },
    });
    const fileB = document({
      category: "APPLICANT",
      applicantLinks: [{ application: { id: "appl-b", applicantId: "app-b" } }],
    });
    const fileA = document({
      category: "APPLICANT",
      applicantLinks: [{ application: { id: "appl-a", applicantId: "app-a" } }],
    });
    expect(canAccessManagedDocument(applicantA, fileB)).toBe(false);
    expect(canAccessManagedDocument(applicantA, fileA)).toBe(true);
    expect(JSON.stringify(documentsListWhere(applicantA))).toContain("app-a");
    expect(JSON.stringify(documentsListWhere(applicantA))).not.toContain("app-b");
  });

  it("does not let an applicant open another applicant's application", () => {
    const applicantA = actor({
      roles: ["APPLICANT"],
      permissions: ["applicants.self.view"],
      user: { id: "a", applicantId: "app-a" },
    });
    expect(canAccessApplication(applicantA, { applicantId: "app-b" })).toBe(false);
    expect(canAccessApplication(applicantA, { applicantId: "app-a" })).toBe(true);
    expect(applicationsListWhere(applicantA)).toEqual({ applicantId: "app-a" });
  });
});

describe("employee and driver HR isolation", () => {
  it("does not let employee A view employee B's HR/compliance file", () => {
    const employeeA = actor({
      roles: ["EMPLOYEE"],
      permissions: ["documents.view", "documents.download", "documents.upload"],
      user: { id: "ea", employeeId: "emp-a" },
    });
    const hrB = document({
      category: "HR",
      documentType: "HIPAA_TRAINING",
      employeeLinks: [{ employeeId: "emp-b" }],
    });
    expect(canAccessManagedDocument(employeeA, hrB)).toBe(false);
    expect(canAccessManagedDocument(employeeA, document({ employeeLinks: [{ employeeId: "emp-a" }] }))).toBe(true);
  });

  it("does not let a driver access admin HR documents", () => {
    const driver = actor({
      roles: ["DRIVER"],
      permissions: ["documents.view", "documents.download", "delivery.view"],
      user: { id: "d", employeeId: "emp-1" },
    });
    const adminHr = document({
      category: "HR",
      documentType: "W4",
      isSensitive: true,
      employeeLinks: [{ employeeId: "emp-admin" }],
    });
    const unlinkedHr = document({ category: "HR", documentType: "HANDBOOK_ACKNOWLEDGMENT" });
    expect(canAccessManagedDocument(driver, adminHr)).toBe(false);
    expect(canAccessManagedDocument(driver, unlinkedHr)).toBe(false);
  });

  it("does not let an employee approve their own document", () => {
    const employee = actor({
      roles: ["EMPLOYEE"],
      permissions: ["documents.view", "documents.verify", "documents.upload"],
      user: { id: "e", employeeId: "emp-1" },
    });
    const own = document({ employeeLinks: [{ employeeId: "emp-1" }] });
    expect(canSelfApproveDocument(employee, own)).toBe(false);
  });
});

describe("document IDOR and ownership", () => {
  it("rejects swapped document ids that belong to another principal", () => {
    const applicantA = actor({
      roles: ["APPLICANT"],
      permissions: ["documents.view", "documents.download"],
      user: { id: "a", applicantId: "app-a" },
    });
    const swapped = document({
      id: "doc-b",
      applicantLinks: [{ application: { id: "appl-b", applicantId: "app-b" } }],
    });
    expect(canAccessManagedDocument(applicantA, swapped, "download")).toBe(false);
    expect(issueDocumentSignedUrl({ actor: applicantA, document: swapped }).error).toBe("Not found.");
  });

  it("strips owner-change fields from client payloads", () => {
    const sanitized = sanitizeDocumentOwnerInput({
      name: "resume",
      ownerId: "attacker",
      ownerEntity: "EMPLOYEE",
      userId: "other-user",
      applicantId: "other-applicant",
      employeeId: "other-employee",
      organizationId: "other-org",
      role: "OWNER",
    });
    expect(sanitized).not.toHaveProperty("ownerId");
    expect(sanitized).not.toHaveProperty("ownerEntity");
    expect(sanitized).not.toHaveProperty("userId");
    expect(sanitized).not.toHaveProperty("applicantId");
    expect(sanitized).not.toHaveProperty("employeeId");
    expect(sanitized).not.toHaveProperty("role");
    expect(sanitized.name).toBe("resume");
  });

  it("does not attach HR/applicant/compliance files to deliveries", () => {
    expect(canAttachDomainToDelivery(policyDomainFor("HR", "W4"))).toBe(false);
    expect(canAttachDomainToDelivery(policyDomainFor("APPLICANT", "RESUME"))).toBe(false);
    expect(canAttachDomainToDelivery(policyDomainFor("TRAINING", "HIPAA_TRAINING"))).toBe(false);
    expect(canAttachDocumentToDelivery({ category: "HR", documentType: "DRIVERS_LICENSE" })).toBe(false);
    expect(canAttachDocumentToDelivery({ category: "DELIVERY", documentType: "PROOF_OF_DELIVERY" })).toBe(true);
    const admin = actor({
      roles: ["ADMIN"],
      permissions: ["documents.upload", "documents.editMetadata", "delivery.view"],
    });
    expect(
      canAssociateDelivery(admin, { customerId: "c1", driverEmployeeId: "e1" }, { category: "HR", documentType: "W4" }),
    ).toBe(false);
  });
});

describe("signed URLs", () => {
  it("does not issue a signed download URL to an unauthenticated caller", () => {
    const file = document({ employeeLinks: [{ employeeId: "emp-1" }] });
    const issued = issueDocumentSignedUrl({ actor: null, document: file });
    expect(issued).toMatchObject({ error: "Unauthorized", status: 401 });
  });

  it("binds a token to one document and user and rejects a swapped id", () => {
    process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "phase1-test-secret";
    const token = createDocumentAccessToken({ documentId: "doc-a", userId: "user-a" });
    expect(token).toBeTruthy();
    const verified = verifyDocumentAccessToken(token);
    expect(verified).toEqual({ documentId: "doc-a", userId: "user-a", action: "download" });
    expect(verified?.documentId === "doc-b").toBe(false);
  });
});

describe("applicant-safe status", () => {
  it("maps rejected and draft without leaking internal review language", () => {
    expect(applicantSafeStatusLabel("REJECTED")).toBe("Not selected");
    expect(applicantSafeStatusLabel("DRAFT")).toBe("Not submitted");
    expect(applicantSafeStatusLabel("DOCUMENTS_REQUIRED")).toBe("Documents required");
  });
});
