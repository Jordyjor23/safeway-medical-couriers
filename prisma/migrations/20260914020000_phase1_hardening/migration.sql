-- Phase 1 hardening: additive malware-scan verdict columns.
-- No drops, no resets. Existing rows default to UNSCANNED (not verified safe).

DO $$ BEGIN
  CREATE TYPE "MalwareScanStatus" AS ENUM ('UNSCANNED', 'CLEAN', 'INFECTED', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ManagedDocument" ADD COLUMN IF NOT EXISTS "malwareScanStatus" "MalwareScanStatus" NOT NULL DEFAULT 'UNSCANNED';
ALTER TABLE "ManagedDocument" ADD COLUMN IF NOT EXISTS "malwareScanEngine" TEXT;
