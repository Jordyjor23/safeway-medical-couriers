-- Phase 1: applicant accounts, draft persistence, document review metadata,
-- HR/compliance policy domains, conversion records, requirement assignments,
-- and additive e-signature stubs. No drops, no resets.

ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'DOCUMENTS_REQUIRED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'COMPLIANCE_REVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'HR';
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'APPLICANT';
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'DELIVERY';
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'CUSTOMER';
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'PHI_OPERATIONAL';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPLICATION_ACTION_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_REPLACEMENT_REQUESTED';

DO $$ BEGIN
  CREATE TYPE "DocumentPolicyDomain" AS ENUM ('HR', 'APPLICANT', 'COMPLIANCE', 'DELIVERY', 'CUSTOMER', 'PHI_OPERATIONAL', 'CORPORATE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RequirementAudience" AS ENUM ('APPLICANT', 'EMPLOYEE', 'JOB', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SignatureRequestStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED', 'DECLINED', 'CANCELED', 'EXPIRED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SignatureSubjectType" AS ENUM ('APPLICATION', 'EMPLOYEE', 'CONTRACT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Applicant"
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Applicant_userId_key" ON "Applicant"("userId");

DO $$ BEGIN
  ALTER TABLE "Applicant"
    ADD CONSTRAINT "Applicant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Application"
  ADD COLUMN IF NOT EXISTS "draftPayload" JSONB;

ALTER TABLE "ApplicationNote"
  ADD COLUMN IF NOT EXISTS "visibleToApplicant" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ManagedDocument"
  ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "issueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "policyDomain" "DocumentPolicyDomain";

ALTER TABLE "ComplianceRequirement"
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "documentType" TEXT,
  ADD COLUMN IF NOT EXISTS "issueDateRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "expirationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "reminderSchedule" JSONB;

CREATE TABLE IF NOT EXISTS "RequirementAssignment" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "audience" "RequirementAudience" NOT NULL,
    "applicantId" TEXT,
    "employeeId" TEXT,
    "applicationId" TEXT,
    "jobOpeningId" TEXT,
    "assignedById" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RequirementAssignment_applicantId_active_idx" ON "RequirementAssignment"("applicantId", "active");
CREATE INDEX IF NOT EXISTS "RequirementAssignment_employeeId_active_idx" ON "RequirementAssignment"("employeeId", "active");
CREATE INDEX IF NOT EXISTS "RequirementAssignment_applicationId_active_idx" ON "RequirementAssignment"("applicationId", "active");
CREATE INDEX IF NOT EXISTS "RequirementAssignment_jobOpeningId_active_idx" ON "RequirementAssignment"("jobOpeningId", "active");

DO $$ BEGIN
  ALTER TABLE "RequirementAssignment"
    ADD CONSTRAINT "RequirementAssignment_requirementId_fkey"
    FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RequirementAssignment"
    ADD CONSTRAINT "RequirementAssignment_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RequirementAssignment"
    ADD CONSTRAINT "RequirementAssignment_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RequirementAssignment"
    ADD CONSTRAINT "RequirementAssignment_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RequirementAssignment"
    ADD CONSTRAINT "RequirementAssignment_jobOpeningId_fkey"
    FOREIGN KEY ("jobOpeningId") REFERENCES "JobOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RequirementAssignment"
    ADD CONSTRAINT "RequirementAssignment_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ApplicantEmployeeConversion" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "userId" TEXT,
    "convertedById" TEXT,
    "documentIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicantEmployeeConversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApplicantEmployeeConversion_applicationId_key" ON "ApplicantEmployeeConversion"("applicationId");
CREATE INDEX IF NOT EXISTS "ApplicantEmployeeConversion_applicantId_idx" ON "ApplicantEmployeeConversion"("applicantId");
CREATE INDEX IF NOT EXISTS "ApplicantEmployeeConversion_employeeId_idx" ON "ApplicantEmployeeConversion"("employeeId");

DO $$ BEGIN
  ALTER TABLE "ApplicantEmployeeConversion"
    ADD CONSTRAINT "ApplicantEmployeeConversion_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApplicantEmployeeConversion"
    ADD CONSTRAINT "ApplicantEmployeeConversion_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApplicantEmployeeConversion"
    ADD CONSTRAINT "ApplicantEmployeeConversion_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApplicantEmployeeConversion"
    ADD CONSTRAINT "ApplicantEmployeeConversion_convertedById_fkey"
    FOREIGN KEY ("convertedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SignatureRequest" (
    "id" TEXT NOT NULL,
    "status" "SignatureRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "subjectType" "SignatureSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "providerEnvelopeId" TEXT,
    "sourceDocumentId" TEXT,
    "completedDocumentId" TEXT,
    "auditCertificateKey" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SignatureRequest_subjectType_subjectId_idx" ON "SignatureRequest"("subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "SignatureRequest_status_idx" ON "SignatureRequest"("status");

CREATE TABLE IF NOT EXISTS "SignatureSigner" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),

    CONSTRAINT "SignatureSigner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SignatureSigner_requestId_idx" ON "SignatureSigner"("requestId");

DO $$ BEGIN
  ALTER TABLE "SignatureSigner"
    ADD CONSTRAINT "SignatureSigner_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "SignatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SignatureEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "externalEventId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "SignatureEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SignatureEvent_externalEventId_key" ON "SignatureEvent"("externalEventId");
CREATE INDEX IF NOT EXISTS "SignatureEvent_requestId_occurredAt_idx" ON "SignatureEvent"("requestId", "occurredAt");

DO $$ BEGIN
  ALTER TABLE "SignatureEvent"
    ADD CONSTRAINT "SignatureEvent_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "SignatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
