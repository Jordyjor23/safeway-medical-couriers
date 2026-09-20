import { afterEach, describe, expect, it, vi } from "vitest";
import { AzureDocumentExtractionService } from "@/lib/documents/extraction/azure";
import {
  blocksExternalDocumentExtraction,
  isExternalExtractionAllowed,
} from "@/lib/documents/extraction/egress";
import { isExtractionEnabled, resolveExtractionProvider } from "@/lib/documents/extraction/provider";

const ENV_KEYS = [
  "DOCUMENT_EXTRACTION_PROVIDER",
  "DOCUMENT_EXTRACTION_ALLOW_EXTERNAL",
  "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT",
  "AZURE_DOCUMENT_INTELLIGENCE_KEY",
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.restoreAllMocks();
});

function configureAzure() {
  process.env.DOCUMENT_EXTRACTION_PROVIDER = "azure";
  process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = "https://example.cognitiveservices.azure.com";
  process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = "test-key";
}

describe("document extraction egress policy", () => {
  it("requires an explicit allow-external flag before Azure can be selected", () => {
    configureAzure();
    delete process.env.DOCUMENT_EXTRACTION_ALLOW_EXTERNAL;

    expect(isExternalExtractionAllowed()).toBe(false);
    expect(isExtractionEnabled()).toBe(false);
    expect(resolveExtractionProvider().id).toBe("noop");
  });

  it("classifies sensitive, applicant, identity, and PHI-like records as local-only", () => {
    expect(blocksExternalDocumentExtraction({ isSensitive: true })).toBe(true);
    expect(blocksExternalDocumentExtraction({ category: "APPLICANT_DOCUMENTS" })).toBe(true);
    expect(blocksExternalDocumentExtraction({ documentType: "DRIVERS_LICENSE" })).toBe(true);
    expect(blocksExternalDocumentExtraction({ documentType: "SPECIMEN_DOCUMENTATION" })).toBe(true);
    expect(blocksExternalDocumentExtraction({ documentType: "CHAIN_OF_CUSTODY" })).toBe(true);
    expect(
      blocksExternalDocumentExtraction({
        isSensitive: false,
        documentType: "SIGNED_POLICY",
        category: "POLICIES",
      }),
    ).toBe(false);
  });

  it("never posts a restricted document to Azure even when external OCR is enabled", async () => {
    configureAzure();
    process.env.DOCUMENT_EXTRACTION_ALLOW_EXTERNAL = "true";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
    const azure = new AzureDocumentExtractionService();

    const inputs = [
      { isSensitive: true, documentType: "SIGNED_POLICY", category: "POLICIES" },
      { isSensitive: false, documentType: "DRIVERS_LICENSE", category: "DRIVER_DOCUMENTS" },
      { isSensitive: false, documentType: "SPECIMEN_DOCUMENTATION", category: "COMPLIANCE" },
      { isSensitive: false, documentType: "OTHER", category: "APPLICANT_DOCUMENTS" },
    ];

    for (const metadata of inputs) {
      const result = await azure.extract({
        blobKey: "private/test.pdf",
        mimeType: "application/pdf",
        filename: "test.pdf",
        bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
        ...metadata,
      });
      expect(result.status).toBe("OCR_DISABLED");
      expect(result.provider).toBe("noop");
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows a non-sensitive corporate file to reach Azure only after explicit opt-in", async () => {
    configureAzure();
    process.env.DOCUMENT_EXTRACTION_ALLOW_EXTERNAL = "true";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 400 }));

    const result = await new AzureDocumentExtractionService().extract({
      blobKey: "private/policy.pdf",
      mimeType: "application/pdf",
      filename: "policy.pdf",
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      isSensitive: false,
      documentType: "SIGNED_POLICY",
      category: "POLICIES",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe("azure");
    expect(result.status).toBe("FAILED");
  });
});
