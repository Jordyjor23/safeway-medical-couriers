import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const prisma = vi.hoisted(() => ({
  managedDocument: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  documentExtractedField: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
}));

const loadManagedDocumentForAccess = vi.hoisted(() => vi.fn());
const writeAuditLog = vi.hoisted(() => vi.fn<(input: { action: string }) => Promise<void>>());

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/audit", () => ({ writeAuditLog }));
vi.mock("@/lib/storage", () => ({
  readPrivateFile: vi.fn(async () => ({ stream: null })),
}));
vi.mock("@/lib/documents/operations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/documents/operations")>();
  return { ...actual, loadManagedDocumentForAccess };
});

import {
  canAccessManagedDocument,
  type DocumentAccessRecord,
  type DocumentActor,
} from "@/lib/documents/access";
import { documentMayCountTowardRequirement } from "@/lib/documents/compliance-gate";
import { documentFileHref } from "@/lib/documents/display";
import { startDocumentExtraction } from "@/lib/documents/extraction/run";
import {
  acceptHighConfidenceFields,
  acceptSuggestedDocumentType,
  reviewExtractedField,
} from "@/lib/documents/extraction/review";
import { documentExtractionService, isExtractionEnabled, resolveExtractionProvider } from "@/lib/documents/extraction/provider";
import { prepareExtractedField } from "@/lib/documents/extraction/fields";
import { mapProviderDocumentType } from "@/lib/documents/extraction/map-type";
import { confidenceBand, normalizeProposedDate, normalizeVin } from "@/lib/documents/extraction/normalize";
import { isBlockedFieldKey, looksLikeBlockedValue } from "@/lib/documents/extraction/privacy";
import { TestDocumentExtractionService } from "@/lib/documents/extraction/test-provider";
import { documentBasePath, documentDetailHref, documentReviewHref } from "@/lib/documents/paths";
import { documentLibraryWhere } from "@/lib/documents/query";
import { validateDocumentBytes } from "@/lib/documents/validate";
import { rejectManagedDocument, verifyManagedDocument } from "@/lib/documents/operations";
import { canAccessPortal } from "@/lib/permissions";
import { DOCUMENT_ACCEPT } from "@/lib/documents/catalog";

function actor(overrides: { roles: string[]; permissions?: string[]; user?: Partial<DocumentActor["user"]> }): DocumentActor {
  return {
    user: { id: "user-1", employeeId: null, customerId: null, ...overrides.user },
    roles: overrides.roles,
    permissions: new Set(overrides.permissions ?? []),
  };
}

function access(overrides: Partial<DocumentAccessRecord> = {}): DocumentAccessRecord {
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

function heicBytes(brand = "heic") {
  const bytes = new Uint8Array(16);
  bytes.set(Buffer.from("ftyp"), 4);
  bytes.set(Buffer.from(brand), 8);
  return bytes;
}

function zipWith(contents: string) {
  return Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from(contents)]);
}

const originalProvider = process.env.DOCUMENT_EXTRACTION_PROVIDER;
const originalAzureEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const originalAzureKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

afterEach(() => {
  process.env.DOCUMENT_EXTRACTION_PROVIDER = originalProvider;
  process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = originalAzureEndpoint;
  process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = originalAzureKey;
  vi.clearAllMocks();
});

describe("phase 4 provider selection", () => {
  it("skips extraction when DOCUMENT_EXTRACTION_PROVIDER is empty", async () => {
    process.env.DOCUMENT_EXTRACTION_PROVIDER = "";
    delete process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    delete process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    expect(isExtractionEnabled()).toBe(false);
    const result = await documentExtractionService().extract({ blobKey: "private/x.pdf", mimeType: "application/pdf" });
    expect(result.status).toBe("OCR_DISABLED");
    expect(result.provider).toBe("noop");
    expect(result.fields).toEqual([]);
    await expect(startDocumentExtraction({ documentId: "doc-1", actor: actor({ roles: ["OWNER"], permissions: ["documents.upload"] }) })).resolves.toEqual({
      status: "OCR_DISABLED",
    });
    expect(prisma.managedDocument.findUnique).not.toHaveBeenCalled();
  });

  it("uses the in-process test provider when configured outside production", async () => {
    process.env.DOCUMENT_EXTRACTION_PROVIDER = "test";
    expect(isExtractionEnabled()).toBe(true);
    expect(resolveExtractionProvider().id).toBe("test");
    const result = await new TestDocumentExtractionService().extract({ mimeType: "application/pdf", filename: "license.pdf" });
    expect(result.status).toBe("COMPLETED");
    expect(result.detectedDocumentType).toBe("DRIVERS_LICENSE");
    expect(result.fields.some((field) => field.key === "expirationDate")).toBe(true);
  });

  it("keeps azure unconfigured as noop even if the provider name is set", async () => {
    process.env.DOCUMENT_EXTRACTION_PROVIDER = "azure";
    delete process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    delete process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    expect(isExtractionEnabled()).toBe(false);
    const result = await documentExtractionService().extract({ blobKey: "private/x.pdf", mimeType: "application/pdf" });
    expect(result.status).toBe("OCR_DISABLED");
    expect(result.provider).toBe("noop");
  });

  it("does not enable the test provider in production", () => {
    process.env.DOCUMENT_EXTRACTION_PROVIDER = "test";
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(isExtractionEnabled()).toBe(false);
      expect(resolveExtractionProvider().id).toBe("noop");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("phase 4 unauthorized extraction", () => {
  beforeEach(() => {
    process.env.DOCUMENT_EXTRACTION_PROVIDER = "test";
  });

  it("does not let a customer trigger OCR on another organization's document", async () => {
    loadManagedDocumentForAccess.mockResolvedValue(access({ customerLinks: [{ customerId: "org-b" }] }));
    const customer = actor({
      roles: ["CUSTOMER"],
      permissions: ["documents.view", "documents.upload"],
      user: { id: "u-c", customerId: "org-a" },
    });
    expect(canAccessManagedDocument(customer, access({ customerLinks: [{ customerId: "org-b" }] }))).toBe(false);
    const result = await startDocumentExtraction({ documentId: "doc-1", actor: customer });
    expect(result).toEqual({ error: "Not found." });
    expect(prisma.managedDocument.updateMany).not.toHaveBeenCalled();
  });

  it("does not let a driver extract another employee's file", async () => {
    loadManagedDocumentForAccess.mockResolvedValue(access({ employeeLinks: [{ employeeId: "emp-2" }] }));
    const driver = actor({
      roles: ["DRIVER"],
      permissions: ["documents.view", "documents.download"],
      user: { id: "u-d", employeeId: "emp-1" },
    });
    const result = await startDocumentExtraction({ documentId: "doc-1", actor: driver });
    expect(result).toEqual({ error: "Not found." });
  });
});

describe("phase 4 extraction run", () => {
  const owner = actor({
    roles: ["OWNER"],
    permissions: ["documents.view", "documents.upload", "documents.verify", "documents.editMetadata"],
  });

  beforeEach(() => {
    process.env.DOCUMENT_EXTRACTION_PROVIDER = "test";
    loadManagedDocumentForAccess.mockResolvedValue(access());
    prisma.documentExtractedField.deleteMany.mockResolvedValue({ count: 0 });
    prisma.documentExtractedField.create.mockResolvedValue({ id: "field-1" });
    prisma.managedDocument.update.mockResolvedValue({});
    prisma.managedDocument.updateMany.mockResolvedValue({ count: 1 });
  });

  it("transitions PENDING/PROCESSING then COMPLETED and does not auto-verify", async () => {
    prisma.managedDocument.findUnique.mockResolvedValue({
      id: "doc-1",
      blobKey: "private/x.pdf",
      mimeType: "application/pdf",
      originalFileName: "license.pdf",
      extractionStatus: "PENDING",
      extractionStartedAt: null,
      lifecycleStatus: "UPLOADED",
      verificationStatus: "UNVERIFIED",
    });
    const result = await startDocumentExtraction({ documentId: "doc-1", actor: owner });
    expect(result.status).toBe("COMPLETED");
    expect(prisma.managedDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ extractionStatus: "PROCESSING" }) }),
    );
    const update = prisma.managedDocument.update.mock.calls.find((call) => call[0].data.extractionStatus === "COMPLETED");
    expect(update?.[0].data.verificationStatus).toBeUndefined();
    expect(update?.[0].data.lifecycleStatus).toBe("NEEDS_REVIEW");
    expect(writeAuditLog.mock.calls.map((call) => call[0].action)).toEqual(
      expect.arrayContaining(["document.extraction.started", "document.extraction.completed", "document.type.suggested"]),
    );
  });

  it("stores PARTIAL when the provider reports partial extraction", async () => {
    prisma.managedDocument.findUnique.mockResolvedValue({
      id: "doc-1",
      blobKey: "private/x.pdf",
      mimeType: "application/pdf",
      originalFileName: "partial-ocr.pdf",
      extractionStatus: "PENDING",
      extractionStartedAt: null,
      lifecycleStatus: "UPLOADED",
      verificationStatus: "UNVERIFIED",
    });
    const result = await startDocumentExtraction({ documentId: "doc-1", actor: owner });
    expect(result.status).toBe("PARTIAL");
    expect(prisma.managedDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ extractionStatus: "PARTIAL" }) }),
    );
  });

  it("keeps the original file and marks FAILED without archiving", async () => {
    prisma.managedDocument.findUnique.mockResolvedValue({
      id: "doc-1",
      blobKey: "private/x.pdf",
      mimeType: "application/pdf",
      originalFileName: "fail-ocr.pdf",
      extractionStatus: "PENDING",
      extractionStartedAt: null,
      lifecycleStatus: "UPLOADED",
      verificationStatus: "UNVERIFIED",
    });
    const result = await startDocumentExtraction({ documentId: "doc-1", actor: owner });
    expect(result.status).toBe("FAILED");
    expect(prisma.managedDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          extractionStatus: "FAILED",
          lifecycleStatus: "UPLOADED",
        }),
      }),
    );
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "document.extraction.failed" }));
  });

  it("does not start a second job while PROCESSING", async () => {
    prisma.managedDocument.findUnique.mockResolvedValue({
      id: "doc-1",
      blobKey: "private/x.pdf",
      mimeType: "application/pdf",
      originalFileName: "license.pdf",
      extractionStatus: "PROCESSING",
      extractionStartedAt: new Date(),
      lifecycleStatus: "PROCESSING",
      verificationStatus: "UNVERIFIED",
    });
    const result = await startDocumentExtraction({ documentId: "doc-1", actor: owner, retry: true });
    expect(result.error).toBe("Extraction is already in progress.");
    expect(prisma.managedDocument.updateMany).not.toHaveBeenCalled();
  });

  it("throttles retry unless the previous run failed", async () => {
    prisma.managedDocument.findUnique.mockResolvedValue({
      id: "doc-1",
      blobKey: "private/x.pdf",
      mimeType: "application/pdf",
      originalFileName: "license.pdf",
      extractionStatus: "COMPLETED",
      extractionStartedAt: new Date(),
      lifecycleStatus: "NEEDS_REVIEW",
      verificationStatus: "UNVERIFIED",
    });
    const result = await startDocumentExtraction({ documentId: "doc-1", actor: owner, retry: true });
    expect(result.error).toBe("Wait before retrying extraction.");
  });

  it("allows retry after failure and logs extraction.retried", async () => {
    prisma.managedDocument.findUnique.mockResolvedValue({
      id: "doc-1",
      blobKey: "private/x.pdf",
      mimeType: "application/pdf",
      originalFileName: "license.pdf",
      extractionStatus: "FAILED",
      extractionStartedAt: new Date(),
      lifecycleStatus: "UPLOADED",
      verificationStatus: "UNVERIFIED",
    });
    const result = await startDocumentExtraction({ documentId: "doc-1", actor: owner, retry: true });
    expect(result.status).toBe("COMPLETED");
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "document.extraction.retried" }));
  });
});

describe("phase 4 type mapping and fields", () => {
  it("maps provider labels to internal document types", () => {
    expect(mapProviderDocumentType("certificate_of_liability_insurance")).toBe("BUSINESS_INSURANCE_COI");
    expect(mapProviderDocumentType("drivers_license")).toBe("DRIVERS_LICENSE");
    expect(mapProviderDocumentType("unknown_vendor_label")).toBeNull();
  });

  it("assigns confidence bands without calling them accuracy", () => {
    expect(confidenceBand(0.92)).toBe("High");
    expect(confidenceBand(0.6)).toBe("Medium");
    expect(confidenceBand(0.2)).toBe("Low");
  });

  it("flags ambiguous day/month dates instead of guessing", () => {
    const ambiguous = normalizeProposedDate("03/04/2027");
    expect(ambiguous.ambiguous).toBe(true);
    const unambiguous = normalizeProposedDate("2027-11-04");
    expect(unambiguous).toEqual({ ok: true, iso: "2027-11-04", ambiguous: false });
    expect(normalizeProposedDate("13/04/2027")).toEqual({
      ok: true,
      iso: "2027-04-13",
      ambiguous: false,
    });
  });

  it("does not persist SSN, bank, or DOB as extracted fields", () => {
    expect(isBlockedFieldKey("ssn")).toBe(true);
    expect(isBlockedFieldKey("dateOfBirth")).toBe(true);
    expect(looksLikeBlockedValue("123-45-6789")).toBe(true);
    expect(prepareExtractedField({ key: "ssn", rawValue: "123-45-6789", confidence: 0.99 })).toBeNull();
    expect(prepareExtractedField({ key: "fullName", rawValue: "Jordan Rivera", confidence: 0.9 })?.mapsToDocumentField).toBe("name");
    expect(normalizeVin("1hg cm82633a004352")).toBe("1HGCM82633A004352");
  });
});

describe("phase 4 field review", () => {
  const reviewer = actor({
    roles: ["COMPLIANCE_ADMIN"],
    permissions: ["documents.view", "documents.editMetadata", "documents.verify"],
  });

  beforeEach(() => {
    loadManagedDocumentForAccess.mockResolvedValue(access());
    prisma.documentExtractedField.update.mockResolvedValue({});
    prisma.managedDocument.update.mockResolvedValue({});
  });

  it("accepts a mapped expiration onto ManagedDocument metadata only", async () => {
    prisma.documentExtractedField.findUnique.mockResolvedValue({
      id: "field-1",
      documentId: "doc-1",
      fieldKey: "expirationDate",
      proposedValue: "2027-11-04",
      rawValue: "2027-11-04",
      mapsToDocumentField: "expirationDate",
      ambiguousDate: false,
      document: { employeeLinks: [], customerLinks: [], contractLinks: [], deliveryLinks: [] },
    });
    const result = await reviewExtractedField({ actor: reviewer, fieldId: "field-1", action: "ACCEPT" });
    expect(result).toEqual({ ok: true });
    expect(prisma.managedDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { expirationDate: new Date("2027-11-04T00:00:00.000Z") } }),
    );
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "document.field.accepted" }));
  });

  it("retains the original extracted value when the reviewer edits", async () => {
    prisma.documentExtractedField.findUnique.mockResolvedValue({
      id: "field-1",
      documentId: "doc-1",
      fieldKey: "policyNumber",
      proposedValue: "ABC-1",
      rawValue: "ABC 1",
      mapsToDocumentField: null,
      ambiguousDate: false,
      document: { employeeLinks: [], customerLinks: [], contractLinks: [], deliveryLinks: [] },
    });
    await reviewExtractedField({ actor: reviewer, fieldId: "field-1", action: "EDIT", value: "ABC-100" });
    expect(prisma.documentExtractedField.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { reviewStatus: "EDITED", proposedValue: "ABC-100" } }),
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document.field.edited", metadata: expect.objectContaining({ before: "ABC-1" }) }),
    );
  });

  it("ignores a field without writing ManagedDocument metadata", async () => {
    prisma.documentExtractedField.findUnique.mockResolvedValue({
      id: "field-1",
      documentId: "doc-1",
      fieldKey: "fullName",
      proposedValue: "Jordan Rivera",
      rawValue: "Jordan Rivera",
      mapsToDocumentField: "name",
      ambiguousDate: false,
      document: { employeeLinks: [], customerLinks: [], contractLinks: [], deliveryLinks: [] },
    });
    await reviewExtractedField({ actor: reviewer, fieldId: "field-1", action: "IGNORE" });
    expect(prisma.documentExtractedField.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewStatus: "IGNORED" }),
      }),
    );
    expect(prisma.managedDocument.update).not.toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "document.field.ignored" }));
  });

  it("does not apply an ambiguous date on Accept", async () => {
    prisma.documentExtractedField.findUnique.mockResolvedValue({
      id: "field-1",
      documentId: "doc-1",
      fieldKey: "expirationDate",
      proposedValue: "03/04/2027",
      rawValue: "03/04/2027",
      mapsToDocumentField: "expirationDate",
      ambiguousDate: true,
      document: { employeeLinks: [], customerLinks: [], contractLinks: [], deliveryLinks: [] },
    });
    await reviewExtractedField({ actor: reviewer, fieldId: "field-1", action: "ACCEPT" });
    expect(prisma.managedDocument.update).not.toHaveBeenCalled();
  });

  it("does not let another customer accept fields", async () => {
    loadManagedDocumentForAccess.mockResolvedValue(access({ customerLinks: [{ customerId: "org-b" }] }));
    prisma.documentExtractedField.findUnique.mockResolvedValue({
      id: "field-1",
      documentId: "doc-1",
      fieldKey: "fullName",
      proposedValue: "A",
      rawValue: "A",
      mapsToDocumentField: null,
      ambiguousDate: false,
      document: {},
    });
    const customer = actor({
      roles: ["CUSTOMER"],
      permissions: ["documents.editMetadata"],
      user: { id: "u", customerId: "org-a" },
    });
    await expect(reviewExtractedField({ actor: customer, fieldId: "field-1", action: "ACCEPT" })).resolves.toEqual({
      error: "Not found.",
    });
  });

  it("requires explicit confirmation before accept-all high confidence", async () => {
    await expect(acceptHighConfidenceFields({ actor: reviewer, documentId: "doc-1", confirmed: false })).resolves.toEqual({
      error: "Confirm that you reviewed each field.",
    });
    expect(prisma.documentExtractedField.findMany).not.toHaveBeenCalled();
  });

  it("accepts a suggested type only when the reviewer chooses it", async () => {
    prisma.managedDocument.findUnique.mockResolvedValue({ id: "doc-1", suggestedDocumentType: "DRIVERS_LICENSE" });
    await acceptSuggestedDocumentType({ actor: reviewer, documentId: "doc-1", accept: true, documentType: "DRIVERS_LICENSE" });
    expect(prisma.managedDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { documentType: "DRIVERS_LICENSE", suggestedTypeStatus: "ACCEPTED" } }),
    );
  });
});

describe("phase 4 verification", () => {
  const reviewer = actor({
    roles: ["COMPLIANCE_ADMIN"],
    permissions: ["documents.view", "documents.verify"],
  });

  it("requires a human verify action and writes audit", async () => {
    prisma.managedDocument.findUnique.mockResolvedValue(access());
    prisma.managedDocument.update.mockResolvedValue({ id: "doc-1", verificationStatus: "VERIFIED" });
    await verifyManagedDocument({ documentId: "doc-1", actor: reviewer });
    expect(prisma.managedDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ verificationStatus: "VERIFIED" }) }),
    );
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "document.verified" }));
  });

  it("stores a rejection reason", async () => {
    prisma.managedDocument.findUnique.mockResolvedValue(access());
    prisma.managedDocument.update.mockResolvedValue({ id: "doc-1" });
    await rejectManagedDocument({ documentId: "doc-1", actor: reviewer, reason: "Illegible scan" });
    expect(prisma.managedDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ verificationStatus: "REJECTED", rejectionReason: "Illegible scan" }) }),
    );
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "document.rejected" }));
  });
});

describe("phase 4 compliance gate", () => {
  it("does not count an OCR hit as satisfying a requirement", () => {
    expect(
      documentMayCountTowardRequirement({
        documentType: "DRIVERS_LICENSE",
        verificationStatus: "UNVERIFIED",
        suggestedTypeStatus: "PENDING",
        employeeLinks: [{ employeeId: "emp-1" }],
        customerLinks: [],
        contractLinks: [],
        deliveryLinks: [],
      }),
    ).toBe(false);
    expect(
      documentMayCountTowardRequirement({
        documentType: "DRIVERS_LICENSE",
        verificationStatus: "VERIFIED",
        suggestedTypeStatus: "ACCEPTED",
        employeeLinks: [{ employeeId: "emp-1" }],
        customerLinks: [],
        contractLinks: [],
        deliveryLinks: [],
      }),
    ).toBe(true);
  });
});

describe("phase 4 operations routing", () => {
  it("keeps Operations Manager off the staff dashboard layout", () => {
    expect(canAccessPortal(["OPERATIONS_MANAGER"], "staff")).toBe(false);
    expect(canAccessPortal(["OPERATIONS_MANAGER"], "operations")).toBe(true);
    expect(documentBasePath("operations")).toBe("/operations/documents");
    expect(documentDetailHref("operations", "doc-9")).toBe("/operations/documents/doc-9");
    expect(documentReviewHref("operations")).toBe("/operations/documents/review");
    expect(documentDetailHref("staff", "doc-9")).toBe("/dashboard/documents/doc-9");
  });
});

describe("phase 4 HEIC and DOCX validation", () => {
  it("accepts HEIC by ftyp brand and keeps it in the picker", () => {
    const bytes = heicBytes("heic");
    const result = validateDocumentBytes({
      filename: "scan.heic",
      claimedType: "image/heic",
      sizeBytes: bytes.length,
      bytes,
    });
    expect(result.ok).toBe(true);
    expect(DOCUMENT_ACCEPT).toContain(".heic");
  });

  it("accepts DOCX only when the zip contains Word markup", () => {
    const docx = zipWith("[Content_Types].xml word/document.xml");
    const result = validateDocumentBytes({
      filename: "policy.docx",
      claimedType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: docx.length,
      bytes: docx,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a generic zip or spreadsheet posing as DOCX", () => {
    const zip = zipWith("readme.txt");
    expect(
      validateDocumentBytes({
        filename: "notes.docx",
        claimedType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: zip.length,
        bytes: zip,
      }).ok,
    ).toBe(false);
    const xlsx = zipWith("[Content_Types].xml xl/workbook.xml");
    expect(
      validateDocumentBytes({
        filename: "sheet.docx",
        claimedType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: xlsx.length,
        bytes: xlsx,
      }).ok,
    ).toBe(false);
  });
});

describe("phase 4 privacy and preview", () => {
  it("uses the secure file endpoint instead of a Blob URL", () => {
    expect(documentFileHref("doc-1")).toBe("/api/portal/documents/doc-1/file");
    expect(documentFileHref("doc-1")).not.toContain("blob.vercel");
  });

  it("does not search raw OCR text in the library query", () => {
    const owner = actor({ roles: ["OWNER"], permissions: ["documents.view"] });
    expect(JSON.stringify(documentLibraryWhere(owner, { q: "secret" }))).toContain("name");
    expect(JSON.stringify(documentLibraryWhere(owner, { q: "secret" }))).not.toContain("extractionRawText");
  });

  it("filters the review queue without mixing verification into extraction state", () => {
    const owner = actor({ roles: ["OWNER"], permissions: ["documents.view"] });
    const where = documentLibraryWhere(owner, { needsReview: "1", extraction: "COMPLETED", verification: "UNVERIFIED" });
    expect(JSON.stringify(where)).toContain("COMPLETED");
    expect(JSON.stringify(where)).toContain("UNVERIFIED");
    expect(JSON.stringify(where)).toContain("NEEDS_REVIEW");
  });
});

describe("phase 4 schema", () => {
  it("keeps extraction state separate from verification and stores review fields", () => {
    const schema = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toContain("enum DocumentExtractionStatus");
    expect(schema).toContain("enum DocumentVerificationStatus");
    expect(schema).toContain("model DocumentExtractedField");
    expect(schema).toContain("extractionRawText");
    expect(schema).toContain("suggestedDocumentType");
  });
});
