-- Phase 1.5 compliance schema extension: controlled document register,
-- implementation tasks, service authorization matrix, richer assignment
-- actions, and additional library categories.
-- Additive only. No drops, no resets, no document bytes.

DO $$ BEGIN
  ALTER TYPE "CompanyLibraryCategory" ADD VALUE 'CORPORATE_GOVERNANCE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "CompanyLibraryCategory" ADD VALUE 'FORMS_RECORDS';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "CompanyLibraryCategory" ADD VALUE 'DOCUMENT_CONTROL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "CompanyLibraryCategory" ADD VALUE 'UN3373';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "CompanyLibraryCategory" ADD VALUE 'MEDICAL_COURIER_OPERATIONS';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "CompanyAssignmentAction" ADD VALUE 'TRAINING_REQUIRED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "CompanyAssignmentAction" ADD VALUE 'COMPETENCY_REQUIRED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "CompanyAssignmentAction" ADD VALUE 'ROLE_AUTHORIZATION';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "CompanyAssignmentAction" ADD VALUE 'REFERENCE_ONLY';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ControlledDocumentStatus" AS ENUM (
    'PENDING_SOURCE', 'DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ControlledDocumentType" AS ENUM (
    'MANUAL', 'PROGRAM', 'SOP', 'POLICY', 'FORM', 'TEMPLATE', 'PLAN'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ImplementationTaskStatus" AS ENUM (
    'OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'WAIVED', 'CANCELED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ServiceAuthorizationStatus" AS ENUM (
    'AUTHORIZED',
    'AUTHORIZED_AFTER_ROLE_TRAINING',
    'AUTHORIZED_WITH_WRITTEN_CLIENT_PROTOCOL',
    'AUTHORIZED_AFTER_APPLICABLE_TRAINING',
    'CONDITIONAL',
    'DEFERRED',
    'PROHIBITED',
    'REJECT_HOLD'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ControlledDocument" (
  "id" TEXT NOT NULL,
  "controlledDocumentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "parentCompanyDocumentId" TEXT,
  "sourceManagedDocumentId" TEXT,
  "category" "CompanyLibraryCategory" NOT NULL,
  "documentType" "ControlledDocumentType" NOT NULL,
  "revision" TEXT NOT NULL DEFAULT '1.0',
  "effectiveDate" TIMESTAMP(3),
  "reviewDate" TIMESTAMP(3),
  "status" "ControlledDocumentStatus" NOT NULL DEFAULT 'PENDING_SOURCE',
  "sectionReference" TEXT,
  "pageReference" TEXT,
  "ownerRole" TEXT,
  "approvalAuthority" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "supersedesControlledDocumentId" TEXT,
  "metadata" JSONB,
  "packageKey" TEXT NOT NULL DEFAULT 'SC-MCM-001',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ControlledDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ControlledDocument_controlledDocumentId_key"
  ON "ControlledDocument"("controlledDocumentId");
CREATE INDEX IF NOT EXISTS "ControlledDocument_packageKey_status_idx"
  ON "ControlledDocument"("packageKey", "status");
CREATE INDEX IF NOT EXISTS "ControlledDocument_status_active_idx"
  ON "ControlledDocument"("status", "active");
CREATE INDEX IF NOT EXISTS "ControlledDocument_sourceManagedDocumentId_idx"
  ON "ControlledDocument"("sourceManagedDocumentId");
CREATE INDEX IF NOT EXISTS "ControlledDocument_parentCompanyDocumentId_idx"
  ON "ControlledDocument"("parentCompanyDocumentId");
CREATE INDEX IF NOT EXISTS "ControlledDocument_documentType_idx"
  ON "ControlledDocument"("documentType");

DO $$ BEGIN
  ALTER TABLE "ControlledDocument" ADD CONSTRAINT "ControlledDocument_parentCompanyDocumentId_fkey"
    FOREIGN KEY ("parentCompanyDocumentId") REFERENCES "CompanyDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ControlledDocument" ADD CONSTRAINT "ControlledDocument_sourceManagedDocumentId_fkey"
    FOREIGN KEY ("sourceManagedDocumentId") REFERENCES "ManagedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ControlledDocument" ADD CONSTRAINT "ControlledDocument_supersedesControlledDocumentId_fkey"
    FOREIGN KEY ("supersedesControlledDocumentId") REFERENCES "ControlledDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ComplianceImplementationTask" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "sourceControlledDocumentId" TEXT,
  "assignedRole" TEXT,
  "assignedUserId" TEXT,
  "dueDate" TIMESTAMP(3),
  "status" "ImplementationTaskStatus" NOT NULL DEFAULT 'OPEN',
  "completedAt" TIMESTAMP(3),
  "completedBy" TEXT,
  "evidenceManagedDocumentId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceImplementationTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ComplianceImplementationTask_key_key"
  ON "ComplianceImplementationTask"("key");
CREATE INDEX IF NOT EXISTS "ComplianceImplementationTask_status_idx"
  ON "ComplianceImplementationTask"("status");
CREATE INDEX IF NOT EXISTS "ComplianceImplementationTask_assignedRole_status_idx"
  ON "ComplianceImplementationTask"("assignedRole", "status");
CREATE INDEX IF NOT EXISTS "ComplianceImplementationTask_sourceControlledDocumentId_idx"
  ON "ComplianceImplementationTask"("sourceControlledDocumentId");

DO $$ BEGIN
  ALTER TABLE "ComplianceImplementationTask" ADD CONSTRAINT "ComplianceImplementationTask_sourceControlledDocumentId_fkey"
    FOREIGN KEY ("sourceControlledDocumentId") REFERENCES "ControlledDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ComplianceImplementationTask" ADD CONSTRAINT "ComplianceImplementationTask_assignedUserId_fkey"
    FOREIGN KEY ("assignedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ComplianceImplementationTask" ADD CONSTRAINT "ComplianceImplementationTask_completedBy_fkey"
    FOREIGN KEY ("completedBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ComplianceImplementationTask" ADD CONSTRAINT "ComplianceImplementationTask_evidenceManagedDocumentId_fkey"
    FOREIGN KEY ("evidenceManagedDocumentId") REFERENCES "ManagedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ServiceAuthorization" (
  "id" TEXT NOT NULL,
  "serviceName" TEXT NOT NULL,
  "serviceCode" TEXT NOT NULL,
  "status" "ServiceAuthorizationStatus" NOT NULL,
  "activationRule" TEXT,
  "sourceControlledDocumentId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceAuthorization_serviceCode_key"
  ON "ServiceAuthorization"("serviceCode");
CREATE INDEX IF NOT EXISTS "ServiceAuthorization_status_active_idx"
  ON "ServiceAuthorization"("status", "active");
CREATE INDEX IF NOT EXISTS "ServiceAuthorization_sourceControlledDocumentId_idx"
  ON "ServiceAuthorization"("sourceControlledDocumentId");

DO $$ BEGIN
  ALTER TABLE "ServiceAuthorization" ADD CONSTRAINT "ServiceAuthorization_sourceControlledDocumentId_fkey"
    FOREIGN KEY ("sourceControlledDocumentId") REFERENCES "ControlledDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CompanyDocumentAssignment" ADD COLUMN IF NOT EXISTS "controlledDocumentId" TEXT;

CREATE INDEX IF NOT EXISTS "CompanyDocumentAssignment_controlledDocumentId_active_idx"
  ON "CompanyDocumentAssignment"("controlledDocumentId", "active");

DO $$ BEGIN
  ALTER TABLE "CompanyDocumentAssignment" ADD CONSTRAINT "CompanyDocumentAssignment_controlledDocumentId_fkey"
    FOREIGN KEY ("controlledDocumentId") REFERENCES "ControlledDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CompanyDocumentAcknowledgment" ADD COLUMN IF NOT EXISTS "controlledDocumentId" TEXT;
ALTER TABLE "CompanyDocumentAcknowledgment" ADD COLUMN IF NOT EXISTS "controlledDocumentRevision" TEXT;
ALTER TABLE "CompanyDocumentAcknowledgment" ADD COLUMN IF NOT EXISTS "controlledDocumentKey" TEXT;

ALTER TABLE "CompanyDocumentAcknowledgment" ALTER COLUMN "companyDocumentId" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "CompanyDocumentAcknowledgment_userId_controlledDocumentId_key"
  ON "CompanyDocumentAcknowledgment"("userId", "controlledDocumentId");
CREATE INDEX IF NOT EXISTS "CompanyDocumentAcknowledgment_controlledDocumentId_idx"
  ON "CompanyDocumentAcknowledgment"("controlledDocumentId");

DO $$ BEGIN
  ALTER TABLE "CompanyDocumentAcknowledgment" ADD CONSTRAINT "CompanyDocumentAcknowledgment_controlledDocumentId_fkey"
    FOREIGN KEY ("controlledDocumentId") REFERENCES "ControlledDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
