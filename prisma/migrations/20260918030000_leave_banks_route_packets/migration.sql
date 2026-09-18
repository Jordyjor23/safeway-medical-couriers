-- Separate paid-leave banks with immutable ledger entries, plus route assignment packets.
-- Additive migration: existing workforce/delivery history remains intact.

ALTER TYPE "TimeOffType" ADD VALUE IF NOT EXISTS 'VACATION';

CREATE TYPE "LeaveBankType" AS ENUM ('PTO', 'SICK', 'VACATION');
CREATE TYPE "LeaveLedgerKind" AS ENUM ('INITIAL', 'ACCRUAL', 'ADJUSTMENT', 'USED', 'RESTORED');
CREATE TYPE "DeliveryChecklistStatus" AS ENUM ('PENDING', 'COMPLETED', 'WAIVED');
CREATE TYPE "DeliverySignoffRole" AS ENUM ('COURIER', 'CONTRACTOR', 'RECIPIENT', 'CUSTOMER', 'STAFF');

ALTER TABLE "TimeOffRequest"
ADD COLUMN "balanceAppliedAt" TIMESTAMP(3),
ADD COLUMN "balanceHoursApplied" DECIMAL(8,2);

CREATE TABLE "LeaveBank" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "type" "LeaveBankType" NOT NULL,
  "balanceHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveBank_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeaveLedgerEntry" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "bankType" "LeaveBankType" NOT NULL,
  "kind" "LeaveLedgerKind" NOT NULL,
  "deltaHours" DECIMAL(8,2) NOT NULL,
  "balanceAfter" DECIMAL(8,2) NOT NULL,
  "timeOffRequestId" TEXT,
  "actorUserId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaveLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryChecklistItem" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "status" "DeliveryChecklistStatus" NOT NULL DEFAULT 'PENDING',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "completedByUserId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliverySignoff" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "role" "DeliverySignoffRole" NOT NULL,
  "signerName" TEXT NOT NULL,
  "signerTitle" TEXT,
  "signatureText" TEXT NOT NULL,
  "attested" BOOLEAN NOT NULL DEFAULT false,
  "formVersion" TEXT NOT NULL DEFAULT '1.0',
  "notes" TEXT,
  "signedByUserId" TEXT,
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliverySignoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaveBank_employeeId_type_key" ON "LeaveBank"("employeeId", "type");
CREATE INDEX "LeaveBank_employeeId_idx" ON "LeaveBank"("employeeId");
CREATE INDEX "LeaveLedgerEntry_employeeId_bankType_createdAt_idx" ON "LeaveLedgerEntry"("employeeId", "bankType", "createdAt");
CREATE INDEX "LeaveLedgerEntry_timeOffRequestId_idx" ON "LeaveLedgerEntry"("timeOffRequestId");
CREATE UNIQUE INDEX "DeliveryChecklistItem_deliveryId_key_key" ON "DeliveryChecklistItem"("deliveryId", "key");
CREATE INDEX "DeliveryChecklistItem_deliveryId_status_idx" ON "DeliveryChecklistItem"("deliveryId", "status");
CREATE INDEX "DeliverySignoff_deliveryId_role_signedAt_idx" ON "DeliverySignoff"("deliveryId", "role", "signedAt");

ALTER TABLE "LeaveBank"
ADD CONSTRAINT "LeaveBank_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveLedgerEntry"
ADD CONSTRAINT "LeaveLedgerEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryChecklistItem"
ADD CONSTRAINT "DeliveryChecklistItem_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliverySignoff"
ADD CONSTRAINT "DeliverySignoff_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
