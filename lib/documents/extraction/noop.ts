import type { DocumentExtractionProvider, DocumentExtractionResult } from "@/lib/documents/extraction/types";

export class NoopDocumentExtractionService implements DocumentExtractionProvider {
  readonly id = "noop";

  async extract(): Promise<DocumentExtractionResult> {
    return {
      status: "OCR_DISABLED",
      provider: "noop",
      extractedText: "",
      detectedDocumentType: null,
      typeConfidence: 0,
      fields: [],
      extractedAt: new Date(),
    };
  }
}
