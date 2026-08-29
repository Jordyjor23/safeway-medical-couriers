import { prepareExtractedField } from "@/lib/documents/extraction/fields";
import { MANUAL_EXTRACTION_MESSAGE, isExtractionUnsupportedFormat } from "@/lib/documents/extraction/unsupported";
import type { DocumentExtractionProvider, DocumentExtractionResult } from "@/lib/documents/extraction/types";
import { sanitizeExtractedText } from "@/lib/documents/extraction/privacy";

/** Deterministic in-process provider for tests. Never used in production unless DOCUMENT_EXTRACTION_PROVIDER=test. */
export class TestDocumentExtractionService implements DocumentExtractionProvider {
  readonly id = "test";

  async extract(input: { mimeType: string | null; filename?: string | null }): Promise<DocumentExtractionResult> {
    if (isExtractionUnsupportedFormat(input.mimeType, input.filename)) {
      return {
        status: "NOT_APPLICABLE",
        provider: "test",
        extractedText: "",
        detectedDocumentType: null,
        typeConfidence: 0,
        fields: [],
        extractedAt: new Date(),
        error: MANUAL_EXTRACTION_MESSAGE,
      };
    }
    const fail = (input.filename ?? "").toLowerCase().includes("fail-ocr");
    if (fail) {
      return {
        status: "FAILED",
        provider: "test",
        extractedText: "",
        detectedDocumentType: null,
        typeConfidence: 0,
        fields: [],
        extractedAt: new Date(),
        error: "The extraction provider could not read this file.",
      };
    }
    const partial = (input.filename ?? "").toLowerCase().includes("partial-ocr");
    const license = prepareExtractedField({
      key: "fullName",
      rawValue: "Jordan Rivera",
      confidence: 0.92,
    });
    const expiration = prepareExtractedField({
      key: "expirationDate",
      rawValue: "2027-11-04",
      confidence: partial ? 0.41 : 0.88,
    });
    const ambiguous = prepareExtractedField({
      key: "issueDate",
      rawValue: "03/04/2027",
      confidence: 0.55,
    });
    const fields = [license, expiration, ambiguous].filter((field): field is NonNullable<typeof license> => Boolean(field));
    return {
      status: partial ? "PARTIAL" : "COMPLETED",
      provider: "test",
      extractedText: sanitizeExtractedText("DRIVER LICENSE JORDAN RIVERA EXP 2027-11-04"),
      detectedDocumentType: "DRIVERS_LICENSE",
      typeConfidence: 0.9,
      fields,
      extractedAt: new Date(),
    };
  }
}
