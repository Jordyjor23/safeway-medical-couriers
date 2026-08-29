-- Additive document lifecycle, archive, supersession, delivery associations, and query indexes.
-- Existing ManagedDocument, Employee, Customer, Contract, and Delivery rows are preserved.
-- New columns are nullable or have defaults so existing documents do not need newly required data.

CREATE TYPE "DocumentLifecycleStatus" AS ENUM (
  'UPLOADED',
  'PROCESSING',
  'NEEDS_REVIEW',
  'VERIFIED',
  'REJECTED',
  'SUPERSEDED',
  'ARCHIVED'
);

CREATE TYPE "DocumentVerificationStatus" AS ENUM (
  'UNVERIFIED',
  'VERIFIED',
  'REJECTED'
);

CREATE TYPE "DocumentExtractionStatus" AS ENUM (
  'OCR_DISABLED',
  'PENDING',
  'COMPLETED',
  'FAILED',
  'NOT_APPLICABLE'
);

ALTER TABLE "ManagedDocument"
  ADD COLUMN IF NOT EXISTS "documentType" TEXT,
  ADD COLUMN IF NOT EXISTS "originalFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "storedFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "contentSha256" TEXT,
  ADD COLUMN IF NOT EXISTS "pageCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "isSensitive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lifecycleStatus" "DocumentLifecycleStatus" NOT NULL DEFAULT 'UPLOADED',
  ADD COLUMN IF NOT EXISTS "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verifiedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "archiveReason" TEXT,
  ADD COLUMN IF NOT EXISTS "supersedesId" TEXT,
  ADD COLUMN IF NOT EXISTS "extractionStatus" "DocumentExtractionStatus" NOT NULL DEFAULT 'OCR_DISABLED';

UPDATE "ManagedDocument"
SET "originalFileName" = "name"
WHERE "originalFileName" IS NULL;

UPDATE "ManagedDocument"
SET "lifecycleStatus" = 'ARCHIVED',
    "archivedAt" = COALESCE("archivedAt", "updatedAt")
WHERE "status" = 'ARCHIVED' AND "lifecycleStatus" = 'UPLOADED';

ALTER TABLE "ManagedDocument"
  ADD CONSTRAINT "ManagedDocument_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "ManagedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ManagedDocument_lifecycleStatus_idx" ON "ManagedDocument"("lifecycleStatus");
CREATE INDEX IF NOT EXISTS "ManagedDocument_verificationStatus_idx" ON "ManagedDocument"("verificationStatus");
CREATE INDEX IF NOT EXISTS "ManagedDocument_archivedAt_idx" ON "ManagedDocument"("archivedAt");
CREATE INDEX IF NOT EXISTS "ManagedDocument_createdAt_idx" ON "ManagedDocument"("createdAt");
CREATE INDEX IF NOT EXISTS "ManagedDocument_category_documentType_idx" ON "ManagedDocument"("category", "documentType");
CREATE INDEX IF NOT EXISTS "ManagedDocument_contentSha256_idx" ON "ManagedDocument"("contentSha256");
CREATE INDEX IF NOT EXISTS "ManagedDocument_supersedesId_idx" ON "ManagedDocument"("supersedesId");

CREATE TABLE "DeliveryDocument" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeliveryDocument_deliveryId_idx" ON "DeliveryDocument"("deliveryId");
CREATE INDEX "DeliveryDocument_documentId_idx" ON "DeliveryDocument"("documentId");

ALTER TABLE "DeliveryDocument"
  ADD CONSTRAINT "DeliveryDocument_deliveryId_fkey"
  FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliveryDocument"
  ADD CONSTRAINT "DeliveryDocument_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DocumentRequirementRule" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "appliesTo" TEXT NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRequirementRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentRequirementRule_requirementId_documentType_appliesTo_key"
  ON "DocumentRequirementRule"("requirementId", "documentType", "appliesTo");
CREATE INDEX "DocumentRequirementRule_documentType_idx" ON "DocumentRequirementRule"("documentType");

ALTER TABLE "DocumentRequirementRule"
  ADD CONSTRAINT "DocumentRequirementRule_requirementId_fkey"
  FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ApplicantDocument_applicationId_idx" ON "ApplicantDocument"("applicationId");
CREATE INDEX IF NOT EXISTS "ApplicantDocument_documentId_idx" ON "ApplicantDocument"("documentId");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_documentId_idx" ON "EmployeeDocument"("documentId");
CREATE INDEX IF NOT EXISTS "CustomerDocument_customerId_idx" ON "CustomerDocument"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerDocument_documentId_idx" ON "CustomerDocument"("documentId");
CREATE INDEX IF NOT EXISTS "ContractDocument_contractId_idx" ON "ContractDocument"("contractId");
CREATE INDEX IF NOT EXISTS "ContractDocument_documentId_idx" ON "ContractDocument"("documentId");
