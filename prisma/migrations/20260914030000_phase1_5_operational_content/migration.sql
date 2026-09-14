-- Phase 1.5: company compliance library, assignments, and acknowledgments.
-- Additive only. No drops, no resets. No document bytes stored in Git.

DO $$ BEGIN
  CREATE TYPE "CompanyDocumentPurpose" AS ENUM (
    'REFERENCE', 'POLICY', 'SOP', 'TRAINING', 'FORM',
    'ACKNOWLEDGMENT', 'CERTIFICATION_REQUIREMENT', 'SIGNATURE_REQUIRED', 'TEMPLATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CompanyLibraryCategory" AS ENUM (
    'HIPAA', 'OSHA', 'DOT_HAZMAT', 'BLOODBORNE_PATHOGENS', 'OPERATIONS',
    'DRIVER', 'HR', 'SAFETY', 'PHI', 'EMERGENCY', 'ORGAN_TISSUE',
    'TEMPERATURE_CONTROL', 'GENERAL_COMPLIANCE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CompanyPublicationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CompanyAssignmentAction" AS ENUM (
    'READ', 'READ_AND_ACKNOWLEDGE', 'UPLOAD_CERTIFICATE', 'COMPLETE_FORM', 'SIGN'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CompanyAssignmentAudience" AS ENUM (
    'ALL_EMPLOYEES', 'ALL_DRIVERS', 'ROLE', 'EMPLOYEE', 'APPLICANTS', 'FUTURE_HIRES', 'JOB'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CompanyDocument" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "familyKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "documentNumber" TEXT,
  "revision" TEXT NOT NULL DEFAULT '1.0',
  "purpose" "CompanyDocumentPurpose" NOT NULL,
  "libraryCategory" "CompanyLibraryCategory" NOT NULL,
  "publicationStatus" "CompanyPublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveDate" TIMESTAMP(3),
  "reviewDate" TIMESTAMP(3),
  "responsibleRole" TEXT,
  "publishedAt" TIMESTAMP(3),
  "publishedBy" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompanyDocument_documentId_key" ON "CompanyDocument"("documentId");
CREATE INDEX IF NOT EXISTS "CompanyDocument_familyKey_publicationStatus_idx" ON "CompanyDocument"("familyKey", "publicationStatus");
CREATE INDEX IF NOT EXISTS "CompanyDocument_libraryCategory_purpose_idx" ON "CompanyDocument"("libraryCategory", "purpose");
CREATE INDEX IF NOT EXISTS "CompanyDocument_publicationStatus_idx" ON "CompanyDocument"("publicationStatus");

DO $$ BEGIN
  ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CompanyDocumentAssignment" (
  "id" TEXT NOT NULL,
  "familyKey" TEXT NOT NULL,
  "companyDocumentId" TEXT,
  "action" "CompanyAssignmentAction" NOT NULL,
  "audience" "CompanyAssignmentAudience" NOT NULL,
  "roleKey" TEXT,
  "employeeId" TEXT,
  "jobOpeningId" TEXT,
  "requirementId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "assignedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyDocumentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CompanyDocumentAssignment_familyKey_active_idx" ON "CompanyDocumentAssignment"("familyKey", "active");
CREATE INDEX IF NOT EXISTS "CompanyDocumentAssignment_employeeId_active_idx" ON "CompanyDocumentAssignment"("employeeId", "active");
CREATE INDEX IF NOT EXISTS "CompanyDocumentAssignment_jobOpeningId_active_idx" ON "CompanyDocumentAssignment"("jobOpeningId", "active");
CREATE INDEX IF NOT EXISTS "CompanyDocumentAssignment_audience_active_idx" ON "CompanyDocumentAssignment"("audience", "active");

DO $$ BEGIN
  ALTER TABLE "CompanyDocumentAssignment" ADD CONSTRAINT "CompanyDocumentAssignment_companyDocumentId_fkey"
    FOREIGN KEY ("companyDocumentId") REFERENCES "CompanyDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CompanyDocumentAssignment" ADD CONSTRAINT "CompanyDocumentAssignment_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CompanyDocumentAssignment" ADD CONSTRAINT "CompanyDocumentAssignment_jobOpeningId_fkey"
    FOREIGN KEY ("jobOpeningId") REFERENCES "JobOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CompanyDocumentAssignment" ADD CONSTRAINT "CompanyDocumentAssignment_requirementId_fkey"
    FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CompanyDocumentAssignment" ADD CONSTRAINT "CompanyDocumentAssignment_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CompanyDocumentAcknowledgment" (
  "id" TEXT NOT NULL,
  "companyDocumentId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentRevision" TEXT NOT NULL,
  "contentSha256" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "employeeId" TEXT,
  "applicantId" TEXT,
  "acknowledgmentText" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyDocumentAcknowledgment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompanyDocumentAcknowledgment_userId_companyDocumentId_key"
  ON "CompanyDocumentAcknowledgment"("userId", "companyDocumentId");
CREATE INDEX IF NOT EXISTS "CompanyDocumentAcknowledgment_employeeId_idx" ON "CompanyDocumentAcknowledgment"("employeeId");
CREATE INDEX IF NOT EXISTS "CompanyDocumentAcknowledgment_companyDocumentId_idx" ON "CompanyDocumentAcknowledgment"("companyDocumentId");
CREATE INDEX IF NOT EXISTS "CompanyDocumentAcknowledgment_documentId_idx" ON "CompanyDocumentAcknowledgment"("documentId");

DO $$ BEGIN
  ALTER TABLE "CompanyDocumentAcknowledgment" ADD CONSTRAINT "CompanyDocumentAcknowledgment_companyDocumentId_fkey"
    FOREIGN KEY ("companyDocumentId") REFERENCES "CompanyDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CompanyDocumentAcknowledgment" ADD CONSTRAINT "CompanyDocumentAcknowledgment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CompanyDocumentAcknowledgment" ADD CONSTRAINT "CompanyDocumentAcknowledgment_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
