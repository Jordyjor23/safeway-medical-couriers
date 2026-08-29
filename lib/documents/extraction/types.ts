import type { DocumentTypeKey } from "@/lib/documents/types";

export const EXTRACTION_RETRY_MS = 60_000;
export const EXTRACTION_STALE_PROCESSING_MS = 10 * 60 * 1000;

export const BLOCKED_FIELD_KEYS = [
  "ssn",
  "socialSecurity",
  "social_security_number",
  "bankAccount",
  "bank_account",
  "routingNumber",
  "accountNumber",
  "dateOfBirth",
  "dob",
  "date_of_birth",
  "diagnosis",
  "phi",
  "medicalRecord",
  "npi",
] as const;

export type ExtractionStatus =
  | "OCR_DISABLED"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "NOT_APPLICABLE";

export type ExtractedFieldDraft = {
  key: string;
  label: string;
  rawValue: string;
  proposedValue: string;
  confidence: number;
  sourcePage?: number | null;
  sourceSnippet?: string | null;
  ambiguousDate?: boolean;
  mapsToDocumentField?: "expirationDate" | "effectiveDate" | "name" | null;
};

export type DocumentExtractionResult = {
  status: ExtractionStatus;
  provider: string;
  extractedText: string;
  detectedDocumentType: DocumentTypeKey | null;
  typeConfidence: number;
  fields: ExtractedFieldDraft[];
  extractedAt: Date;
  error?: string;
};

export type DocumentExtractionInput = {
  blobKey: string;
  mimeType: string | null;
  filename?: string | null;
  bytes?: Uint8Array;
};

export interface DocumentExtractionProvider {
  readonly id: string;
  extract(input: DocumentExtractionInput): Promise<DocumentExtractionResult>;
}

export interface DocumentExtractionService {
  extract(input: DocumentExtractionInput): Promise<DocumentExtractionResult>;
}
