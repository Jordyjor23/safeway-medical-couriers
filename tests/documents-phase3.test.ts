import { describe, expect, it } from "vitest";
import {
  associationPickerKinds,
  canAccessManagedDocument,
  canAssociateContract,
  canAssociateCustomer,
  canAssociateDelivery,
  canAssociateEmployee,
  documentsListWhere,
  type DocumentAccessRecord,
  type DocumentActor,
} from "@/lib/documents/access";
import { employeeDocumentBuckets, missingRequirementLabels } from "@/lib/documents/buckets";
import {
  ARCHIVE_CONFIRMATION,
  DOCUMENT_ACCEPT,
  DOCUMENT_CAPTURE,
  DUPLICATE_FILE_WARNING,
} from "@/lib/documents/catalog";
import { expirationLabel } from "@/lib/documents/display";
import { CONTRACT_DOCUMENT_GROUPS, CUSTOMER_DOCUMENT_GROUPS, DELIVERY_DOCUMENT_GROUPS, groupDocumentsByType } from "@/lib/documents/groups";
import { documentLibraryWhere } from "@/lib/documents/query";
import { ALLOWED_DOCUMENT_EXTENSIONS } from "@/lib/documents/types";
import { validateDocumentBytes } from "@/lib/documents/validate";
import { isDuplicateHashWarning } from "@/lib/storage";

function actor(overrides: { roles: string[]; permissions?: string[]; user?: Partial<DocumentActor["user"]> }): DocumentActor {
  return {
    user: { id: "user-1", employeeId: null, customerId: null, ...overrides.user },
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
    ...overrides,
  };
}

describe("phase 3 catalog and upload UI constraints", () => {
  it("exposes only backend-accepted file types including HEIC and DOCX", () => {
    for (const extension of ALLOWED_DOCUMENT_EXTENSIONS) {
      expect(DOCUMENT_ACCEPT).toContain(`.${extension}`);
    }
    expect(DOCUMENT_ACCEPT).not.toContain(".exe");
    expect(DOCUMENT_ACCEPT).not.toContain(".html");
  });

  it("uses standard capture attributes for mobile camera and file picking", () => {
    expect(DOCUMENT_CAPTURE.camera.capture).toBe("environment");
    expect(DOCUMENT_CAPTURE.camera.accept).toContain("image/jpeg");
    expect(DOCUMENT_CAPTURE.photo.accept).toContain("image/png");
    expect(DOCUMENT_CAPTURE.file.accept).toContain("application/pdf");
  });

  it("does not auto-reject duplicates", () => {
    expect(isDuplicateHashWarning(1)).toBe(true);
    expect(DUPLICATE_FILE_WARNING).toBe("This file appears to already exist.");
  });

  it("uses archive wording instead of delete", () => {
    expect(ARCHIVE_CONFIRMATION.toLowerCase()).toContain("archive");
    expect(ARCHIVE_CONFIRMATION.toLowerCase()).not.toContain("delete");
  });
});

describe("phase 3 library filters", () => {
  it("scopes authorized listing and applies name and association filters", () => {
    const owner = actor({ roles: ["OWNER"], permissions: ["documents.view"] });
    const where = documentLibraryWhere(owner, {
      q: "license",
      category: "EMPLOYEE_DOCUMENTS",
      employee: "Jordan",
      verification: "VERIFIED",
      archived: "1",
    });
    const serialized = JSON.stringify(where);
    expect(serialized).toContain("license");
    expect(serialized).toContain("EMPLOYEE_DOCUMENTS");
    expect(serialized).toContain("Jordan");
    expect(serialized).toContain("VERIFIED");
    expect(serialized).toContain("ARCHIVED");
  });

  it("isolates customer library results from another organization", () => {
    const customer = actor({
      roles: ["CUSTOMER"],
      permissions: ["documents.view"],
      user: { id: "u", customerId: "org-a" },
    });
    const where = documentLibraryWhere(customer, { customer: "Other Lab" });
    expect(JSON.stringify(where)).toContain("org-a");
    expect(canAccessManagedDocument(customer, document({ customerLinks: [{ customerId: "org-b" }] }))).toBe(false);
  });

  it("isolates employee library results from another employee", () => {
    const driver = actor({
      roles: ["DRIVER"],
      permissions: ["documents.view", "documents.download"],
      user: { id: "u-d", employeeId: "emp-1" },
    });
    const where = documentLibraryWhere(driver, { employeeId: "emp-2" });
    expect(JSON.stringify(where)).toContain("emp-1");
    expect(canAccessManagedDocument(driver, document({ employeeLinks: [{ employeeId: "emp-2" }] }))).toBe(false);
  });
});

describe("phase 3 association ACL", () => {
  it("lets an admin associate from employee, customer, contract, and delivery profiles", () => {
    const admin = actor({
      roles: ["ADMIN"],
      permissions: ["documents.upload", "documents.view", "employees.view", "customers.view", "contracts.view", "delivery.view"],
    });
    expect(canAssociateEmployee(admin, "emp-1")).toBe(true);
    expect(canAssociateCustomer(admin, "cust-1")).toBe(true);
    expect(canAssociateContract(admin, "cust-1")).toBe(true);
    expect(canAssociateDelivery(admin, { customerId: "cust-1", driverEmployeeId: "emp-1" })).toBe(true);
    expect(associationPickerKinds(admin)).toEqual({
      employee: true,
      customer: true,
      contract: true,
      delivery: true,
    });
  });

  it("blocks a customer from associating another organization's records", () => {
    const customer = actor({
      roles: ["CUSTOMER"],
      permissions: ["documents.view", "documents.upload", "customers.view", "contracts.view", "delivery.view"],
      user: { id: "u", customerId: "org-a" },
    });
    expect(canAssociateCustomer(customer, "org-b")).toBe(false);
    expect(canAssociateCustomer(customer, "org-a")).toBe(true);
    expect(canAssociateEmployee(customer, "emp-1")).toBe(false);
    expect(canAssociateDelivery(customer, { customerId: "org-b", driverEmployeeId: null })).toBe(false);
  });

  it("blocks a driver from associating another employee", () => {
    const driver = actor({
      roles: ["DRIVER"],
      permissions: ["documents.view", "documents.upload", "delivery.view"],
      user: { id: "u", employeeId: "emp-1" },
    });
    expect(canAssociateEmployee(driver, "emp-2")).toBe(false);
    expect(canAssociateEmployee(driver, "emp-1")).toBe(true);
    expect(canAssociateDelivery(driver, { customerId: "c1", driverEmployeeId: "emp-2" })).toBe(false);
    expect(canAssociateDelivery(driver, { customerId: "c1", driverEmployeeId: "emp-1" })).toBe(true);
  });

  it("hides association pickers from users who cannot upload", () => {
    const viewer = actor({
      roles: ["CUSTOMER"],
      permissions: ["documents.view", "documents.download"],
      user: { id: "u", customerId: "org-a" },
    });
    expect(associationPickerKinds(viewer)).toEqual({
      employee: false,
      customer: false,
      contract: false,
      delivery: false,
    });
  });
});

describe("phase 3 expiration display", () => {
  it("shows Valid, Expiring Soon, Expired, and No Expiration from derived state", () => {
    const now = new Date("2026-08-28T00:00:00Z");
    expect(expirationLabel({ lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: null }, now)).toBe("No Expiration");
    expect(
      expirationLabel(
        { lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: new Date("2026-12-01T00:00:00Z") },
        now,
      ),
    ).toBe("Valid");
    expect(
      expirationLabel(
        { lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: new Date("2026-09-01T00:00:00Z") },
        now,
      ),
    ).toBe("Expiring Soon");
    expect(
      expirationLabel(
        { lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: new Date("2026-08-01T00:00:00Z") },
        now,
      ),
    ).toBe("Expired");
  });
});

describe("phase 3 profile grouping", () => {
  it("groups customer, contract, and delivery files without creating a vehicle entity", () => {
    const files = [
      { documentType: "BAA" as const },
      { documentType: "AMENDMENT" as const },
      { documentType: "PROOF_OF_DELIVERY" as const },
      { documentType: "OTHER" as const },
    ];
    expect(groupDocumentsByType(files, CUSTOMER_DOCUMENT_GROUPS).find((group) => group.key === "baa")?.documents).toHaveLength(1);
    expect(groupDocumentsByType(files, CONTRACT_DOCUMENT_GROUPS).find((group) => group.key === "amendments")?.documents).toHaveLength(1);
    expect(groupDocumentsByType(files, DELIVERY_DOCUMENT_GROUPS).find((group) => group.key === "pod")?.documents).toHaveLength(1);
  });

  it("splits employee files into uploaded, expiring, expired, and archived buckets", () => {
    const now = new Date("2026-08-28T00:00:00Z");
    const buckets = employeeDocumentBuckets([
      { documentType: "W9", lifecycleStatus: "UPLOADED", verificationStatus: "UNVERIFIED", expirationDate: new Date("2027-01-01"), archivedAt: null },
      { documentType: "DRIVERS_LICENSE", lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: new Date("2026-09-01"), archivedAt: null },
      { documentType: "HIPAA_TRAINING", lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: new Date("2026-01-01"), archivedAt: null },
      { documentType: "OTHER", lifecycleStatus: "ARCHIVED", verificationStatus: "UNVERIFIED", expirationDate: null, archivedAt: now },
    ]);
    expect(buckets.uploaded).toHaveLength(1);
    expect(buckets.expiringSoon).toHaveLength(1);
    expect(buckets.expired).toHaveLength(1);
    expect(buckets.archived).toHaveLength(1);
  });

  it("shows missing documents only from existing requirement data", () => {
    expect(
      missingRequirementLabels({
        rules: [],
        records: [],
        documents: [],
      }),
    ).toEqual([]);
    expect(
      missingRequirementLabels({
        rules: [{ documentType: "DRIVERS_LICENSE", requirement: { name: "Driver license" } }],
        records: [{ status: "MISSING", requirement: { name: "HIPAA training" } }],
        documents: [{ documentType: "W9", lifecycleStatus: "UPLOADED", verificationStatus: "UNVERIFIED", archivedAt: null }],
      }),
    ).toEqual(["Driver license", "HIPAA training"]);
  });
});

describe("phase 3 validation messages used by the upload UI", () => {
  it("returns friendly errors for unsupported, large, and mismatched files", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    expect(validateDocumentBytes({ filename: "notes.docx", claimedType: "application/pdf", sizeBytes: jpeg.length, bytes: jpeg }).ok).toBe(false);
    const oversized = validateDocumentBytes({
      filename: "scan.jpg",
      claimedType: "image/jpeg",
      sizeBytes: 21 * 1024 * 1024,
      bytes: jpeg,
      maxBytes: 1024,
    });
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.error.toLowerCase()).toContain("mb limit");
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0x00, 0x00]);
    expect(validateDocumentBytes({ filename: "policy.pdf", claimedType: "application/pdf", sizeBytes: pdf.length, bytes: pdf }).ok).toBe(true);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(validateDocumentBytes({ filename: "scan.png", claimedType: "image/png", sizeBytes: png.length, bytes: png }).ok).toBe(true);
  });
});

describe("phase 3 list query still uses documentsListWhere", () => {
  it("does not let documents.view become a global search", () => {
    const customer = actor({
      roles: ["CUSTOMER"],
      permissions: ["documents.view"],
      user: { id: "u", customerId: "org-a" },
    });
    expect(JSON.stringify(documentsListWhere(customer))).not.toEqual("{}");
    expect(JSON.stringify(documentLibraryWhere(customer, { q: "secret" }))).toContain("org-a");
  });
});
