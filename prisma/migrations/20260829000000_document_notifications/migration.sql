-- Phase 5: document expiration/compliance notifications. Additive only.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REQUIRED_DOCUMENT_MISSING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_NEEDS_REVIEW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMPLIANCE_ACTION_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMPLIANCE_NON_COMPLIANT';

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT,
  ADD COLUMN IF NOT EXISTS "thresholdKey" TEXT,
  ADD COLUMN IF NOT EXISTS "emailStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "emailAttemptedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX IF NOT EXISTS "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

ALTER TABLE "DocumentRequirementRule"
  ADD COLUMN IF NOT EXISTS "reminderThresholdDays" JSONB,
  ADD COLUMN IF NOT EXISTS "escalationRules" JSONB;
