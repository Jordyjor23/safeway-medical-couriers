import type { DocumentExtractionResult } from "@/lib/documents/extraction/types";

/** Identity, PHI, and similarly restricted types must stay local-only. */
export const LOCAL_ONLY_DOCUMENT_TYPES = new Set([
  "DRIVERS_LICENSE",
  "STATE_ID",
  "EMPLOYMENT_ELIGIBILITY",
  "W9",
  "W4",
  "DIRECT_DEPOSIT",
  "BACKGROUND_CHECK",
  "DRUG_SCREENING",
  "EMERGENCY_CONTACT",
  "BAA",
  "SPECIMEN_DOCUMENTATION",
  "CHAIN_OF_CUSTODY",
  "TEMPERATURE_LOG",
  "MOTOR_VEHICLE_RECORD",
]);

export function isExternalExtractionAllowed() {
  return (process.env.DOCUMENT_EXTRACTION_ALLOW_EXTERNAL ?? "").trim() === "true";
}

export function blocksExternalDocumentExtraction(input: {
  isSensitive?: boolean | null;
  documentType?: string | null;
  category?: string | null;
}) {
  if (input.isSensitive) return true;
  if (input.category === "APPLICANT_DOCUMENTS") return true;
  if (input.documentType && LOCAL_ONLY_DOCUMENT_TYPES.has(input.documentType)) return true;
  return false;
}

export function disabledExtractionResult(): DocumentExtractionResult {
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
