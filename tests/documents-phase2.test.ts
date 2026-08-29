import { describe, expect, it } from "vitest";
import {
  canAccessManagedDocument,
  documentsListWhere,
  type DocumentAccessRecord,
  type DocumentActor,
} from "@/lib/documents/access";
import { derivedDocumentState, isActiveDocument } from "@/lib/documents/lifecycle";
import { documentExtractionService } from "@/lib/documents/extraction";
import { hashFileBuffer, validateDocumentBytes } from "@/lib/documents/validate";
import { roleHasPermission } from "@/lib/permissions";

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

describe("document row-level access", () => {
  it("does not let documents.view retrieve every document", () => {
    const customer = actor({
      roles: ["CUSTOMER"],
      permissions: ["documents.view", "documents.download"],
      user: { id: "u-c", customerId: "cust-a" },
    });
    expect(canAccessManagedDocument(customer, document({ customerLinks: [{ customerId: "cust-b" }] }))).toBe(false);
    expect(canAccessManagedDocument(customer, document({ customerLinks: [{ customerId: "cust-a" }] }))).toBe(true);
    expect(canAccessManagedDocument(customer, document())).toBe(false);
  });

  it("blocks a driver from another employee's files even with a guessed id", () => {
    const driver = actor({
      roles: ["DRIVER"],
      permissions: ["documents.view", "documents.download"],
      user: { id: "u-d", employeeId: "emp-1" },
    });
    expect(canAccessManagedDocument(driver, document({ employeeLinks: [{ employeeId: "emp-2" }] }))).toBe(false);
    expect(canAccessManagedDocument(driver, document({ employeeLinks: [{ employeeId: "emp-1" }] }))).toBe(true);
    expect(
      canAccessManagedDocument(
        driver,
        document({
          deliveryLinks: [{ delivery: { customerId: "cust-a", driverEmployeeId: "emp-1" } }],
        }),
      ),
    ).toBe(true);
  });

  it("blocks customer A from customer B contract and delivery files", () => {
    const customer = actor({
      roles: ["CUSTOMER"],
      permissions: ["documents.view", "documents.download", "contracts.view", "delivery.view"],
      user: { id: "u-c", customerId: "org-a" },
    });
    expect(
      canAccessManagedDocument(
        customer,
        document({ contractLinks: [{ contract: { customerId: "org-b" } }] }),
      ),
    ).toBe(false);
    expect(
      canAccessManagedDocument(
        customer,
        document({ deliveryLinks: [{ delivery: { customerId: "org-b", driverEmployeeId: "emp-1" } }] }),
      ),
    ).toBe(false);
    expect(
      canAccessManagedDocument(
        customer,
        document({ contractLinks: [{ contract: { customerId: "org-a" } }] }),
      ),
    ).toBe(true);
  });

  it("requires viewSensitive for another employee's sensitive file", () => {
    const hr = actor({
      roles: ["HR_RECRUITER"],
      permissions: ["documents.view", "documents.viewSensitive", "employees.view"],
    });
    const dispatcher = actor({
      roles: ["DISPATCHER"],
      permissions: ["documents.view", "documents.download", "delivery.view"],
    });
    const sensitive = document({ isSensitive: true, employeeLinks: [{ employeeId: "emp-9" }] });
    expect(canAccessManagedDocument(hr, sensitive)).toBe(true);
    expect(canAccessManagedDocument(dispatcher, sensitive)).toBe(false);
  });

  it("lets owners access unlinked corporate files and denies customers", () => {
    const owner = actor({ roles: ["OWNER"], permissions: ["documents.view"] });
    const customer = actor({
      roles: ["CUSTOMER"],
      permissions: ["documents.view"],
      user: { id: "u", customerId: "org-a" },
    });
    expect(canAccessManagedDocument(owner, document())).toBe(true);
    expect(canAccessManagedDocument(customer, document())).toBe(false);
  });

  it("scopes list queries so a customer cannot select another org's rows", () => {
    const customer = actor({
      roles: ["CUSTOMER"],
      permissions: ["documents.view"],
      user: { id: "u", customerId: "org-a" },
    });
    const where = documentsListWhere(customer);
    expect(JSON.stringify(where)).toContain("org-a");
    expect(JSON.stringify(where)).not.toContain("org-b");
    expect(JSON.stringify(where)).toContain("customerId");
  });

  it("denies download without documents.download", () => {
    const viewer = actor({
      roles: ["DISPATCHER"],
      permissions: ["documents.view", "delivery.view"],
    });
    const file = document({ deliveryLinks: [{ delivery: { customerId: "c1", driverEmployeeId: "e1" } }] });
    expect(canAccessManagedDocument(viewer, file, "view")).toBe(true);
    expect(canAccessManagedDocument(viewer, file, "download")).toBe(false);
  });
});

describe("file validation", () => {
  it("accepts a PDF whose contents match the extension", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0x00, 0x00]);
    const result = validateDocumentBytes({
      filename: "policy.pdf",
      claimedType: "application/pdf",
      sizeBytes: bytes.length,
      bytes,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe("application/pdf");
      expect(result.contentSha256).toBe(hashFileBuffer(bytes));
    }
  });

  it("rejects executables, html, mismatched types, and oversized files", () => {
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    expect(
      validateDocumentBytes({ filename: "payload.exe", claimedType: "application/x-msdownload", sizeBytes: exe.length, bytes: exe }).ok,
    ).toBe(false);
    const html = new Uint8Array(Buffer.from("<!doctype html><html>"));
    expect(validateDocumentBytes({ filename: "note.pdf", claimedType: "application/pdf", sizeBytes: html.length, bytes: html }).ok).toBe(false);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    expect(validateDocumentBytes({ filename: "scan.pdf", claimedType: "image/jpeg", sizeBytes: jpeg.length, bytes: jpeg }).ok).toBe(false);
    expect(
      validateDocumentBytes({
        filename: "scan.jpg",
        claimedType: "image/jpeg",
        sizeBytes: 21 * 1024 * 1024,
        bytes: jpeg,
        maxBytes: 1024,
      }).ok,
    ).toBe(false);
  });

  it("sanitizes storage names and blocks path traversal", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25]);
    const result = validateDocumentBytes({
      filename: "../../etc/passwd.pdf",
      claimedType: "application/pdf",
      sizeBytes: bytes.length,
      bytes,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.storedFileName).not.toContain("..");
      expect(result.storedFileName).not.toContain("/");
      expect(result.storedFileName.endsWith(".pdf")).toBe(true);
    }
  });
});

describe("lifecycle derivation", () => {
  it("derives EXPIRING_SOON and EXPIRED instead of storing those as lifecycle values", () => {
    const soon = new Date("2026-09-10T00:00:00Z");
    expect(
      derivedDocumentState(
        { lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: new Date("2026-09-15T00:00:00Z") },
        soon,
        [90, 30, 7],
      ),
    ).toBe("EXPIRING_SOON");
    expect(
      derivedDocumentState(
        { lifecycleStatus: "VERIFIED", verificationStatus: "VERIFIED", expirationDate: new Date("2026-09-01T00:00:00Z") },
        soon,
      ),
    ).toBe("EXPIRED");
  });

  it("keeps archived and superseded documents retrievable as historical records", () => {
    expect(isActiveDocument({ lifecycleStatus: "SUPERSEDED" })).toBe(false);
    expect(isActiveDocument({ lifecycleStatus: "ARCHIVED", archivedAt: new Date() })).toBe(false);
    expect(isActiveDocument({ lifecycleStatus: "VERIFIED" })).toBe(true);
    expect(derivedDocumentState({ lifecycleStatus: "SUPERSEDED", verificationStatus: "VERIFIED" })).toBe("SUPERSEDED");
    expect(derivedDocumentState({ lifecycleStatus: "ARCHIVED", verificationStatus: "VERIFIED", archivedAt: new Date() })).toBe("ARCHIVED");
  });
});

describe("ocr phase 2 safety", () => {
  it("never enables an extraction vendor", async () => {
    process.env.DOCUMENT_EXTRACTION_PROVIDER = "azure";
    const result = await documentExtractionService().extract({ blobKey: "private/x/file.pdf", mimeType: "application/pdf" });
    expect(result.status).toBe("OCR_DISABLED");
    expect(result.provider).toBe("noop");
    expect(result.fields).toEqual([]);
  });
});

describe("role matrix additions", () => {
  it("gives drivers download of their own files but not upload or verify", () => {
    expect(roleHasPermission("DRIVER", "documents.download")).toBe(true);
    expect(roleHasPermission("DRIVER", "documents.upload")).toBe(false);
    expect(roleHasPermission("DRIVER", "documents.verify")).toBe(false);
    expect(roleHasPermission("CUSTOMER", "documents.download")).toBe(true);
    expect(roleHasPermission("CUSTOMER", "documents.upload")).toBe(false);
  });
});
