-- Phase 4: extraction review fields. Additive. Existing documents stay OCR_DISABLED.

ALTER TYPE "DocumentExtractionStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "DocumentExtractionStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';

CREATE TYPE "ExtractedFieldReviewStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'EDITED',
  'IGNORED',
  'REJECTED'
);

CREATE TYPE "SuggestedTypeReviewStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'IGNORED'
);

ALTER TABLE "ManagedDocument"
  ADD COLUMN IF NOT EXISTS "extractionProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "extractionError" TEXT,
  ADD COLUMN IF NOT EXISTS "extractionStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "extractionCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suggestedDocumentType" TEXT,
  ADD COLUMN IF NOT EXISTS "suggestedTypeConfidence" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "suggestedTypeStatus" "SuggestedTypeReviewStatus",
  ADD COLUMN IF NOT EXISTS "extractionRawText" TEXT;

CREATE INDEX IF NOT EXISTS "ManagedDocument_extractionStatus_idx" ON "ManagedDocument"("extractionStatus");

CREATE TABLE "DocumentExtractedField" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "rawValue" TEXT NOT NULL,
    "proposedValue" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "sourcePage" INTEGER,
    "sourceSnippet" TEXT,
    "reviewStatus" "ExtractedFieldReviewStatus" NOT NULL DEFAULT 'PENDING',
    "ambiguousDate" BOOLEAN NOT NULL DEFAULT false,
    "mapsToDocumentField" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentExtractedField_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentExtractedField_documentId_reviewStatus_idx" ON "DocumentExtractedField"("documentId", "reviewStatus");
CREATE INDEX "DocumentExtractedField_fieldKey_idx" ON "DocumentExtractedField"("fieldKey");

ALTER TABLE "DocumentExtractedField"
  ADD CONSTRAINT "DocumentExtractedField_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
