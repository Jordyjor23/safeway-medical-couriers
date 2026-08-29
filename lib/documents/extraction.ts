/** Phase 2/4 extraction facade. Default remains OCR_DISABLED until a provider is configured. */

export type { DocumentExtractionResult, DocumentExtractionService, ExtractedFieldDraft } from "@/lib/documents/extraction/types";
export { documentExtractionService, isExtractionEnabled, resolveExtractionProvider } from "@/lib/documents/extraction/provider";
export { NoopDocumentExtractionService } from "@/lib/documents/extraction/noop";
