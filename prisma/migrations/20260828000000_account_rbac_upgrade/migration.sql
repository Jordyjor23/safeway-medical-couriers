-- Account status, username login, custom roles, sequential IDs, and operational records.
-- Safe additive migration: existing rows stay intact.

CREATE TYPE "AccountStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'INACTIVE', 'TERMINATED');
CREATE TYPE "DeliveryStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED');
CREATE TYPE "IncidentType" AS ENUM ('SAFETY', 'EXPOSURE', 'VEHICLE', 'PACKAGE', 'SECURITY', 'TEMPERATURE', 'DAMAGE');

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS "username" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "activationExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "terminatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "terminatedBy" TEXT;

UPDATE "user"
SET "accountStatus" = 'SUSPENDED'
WHERE "disabled" = true AND "accountStatus" = 'ACTIVE';

UPDATE "user"
SET "username" = lower(split_part("email", '@', 1) || substr(replace("id", '-', ''), 1, 4))
WHERE "username" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "user_username_key" ON "user"("username");

ALTER TABLE "Role" ALTER COLUMN "key" TYPE TEXT USING "key"::text;
DROP TYPE IF EXISTS "RoleKey";

ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "isDriver" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "managerId" TEXT;

CREATE INDEX IF NOT EXISTS "Employee_managerId_idx" ON "Employee"("managerId");

ALTER TABLE "Employee"
  ADD CONSTRAINT "Employee_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "clientNumber" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_clientNumber_key" ON "Customer"("clientNumber");

CREATE TABLE IF NOT EXISTS "IdSequence" (
  "key" TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "IdSequence_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "Delivery" (
  "id" TEXT NOT NULL,
  "deliveryNumber" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "driverEmployeeId" TEXT,
  "assignedById" TEXT,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'DRAFT',
  "pickupAddress" TEXT NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "pickupAt" TIMESTAMP(3),
  "deliverBy" TIMESTAMP(3),
  "customerInstructions" TEXT,
  "handlingInstructions" TEXT,
  "shipmentType" TEXT,
  "temperatureRequired" TEXT,
  "chainOfCustodyRequired" BOOLEAN NOT NULL DEFAULT false,
  "proofOfDeliveryRequired" BOOLEAN NOT NULL DEFAULT true,
  "recipientName" TEXT,
  "deliveryNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Delivery_deliveryNumber_key" ON "Delivery"("deliveryNumber");
CREATE INDEX IF NOT EXISTS "Delivery_customerId_status_idx" ON "Delivery"("customerId", "status");
CREATE INDEX IF NOT EXISTS "Delivery_driverEmployeeId_status_idx" ON "Delivery"("driverEmployeeId", "status");

ALTER TABLE "Delivery"
  ADD CONSTRAINT "Delivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Delivery_driverEmployeeId_fkey" FOREIGN KEY ("driverEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Delivery_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "DeliveryEvent" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "kind" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DeliveryEvent_deliveryId_createdAt_idx" ON "DeliveryEvent"("deliveryId", "createdAt");

ALTER TABLE "DeliveryEvent"
  ADD CONSTRAINT "DeliveryEvent_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "IncidentReport" (
  "id" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "deliveryId" TEXT,
  "type" "IncidentType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IncidentReport_reporterUserId_createdAt_idx" ON "IncidentReport"("reporterUserId", "createdAt");

ALTER TABLE "IncidentReport"
  ADD CONSTRAINT "IncidentReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "IncidentReport_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "EmployeeTask" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmployeeTask_employeeId_idx" ON "EmployeeTask"("employeeId");

ALTER TABLE "EmployeeTask"
  ADD CONSTRAINT "EmployeeTask_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "IdSequence" ("key", "value") VALUES ('EMP', 0), ('DRV', 0), ('CLI', 0), ('DLV', 0)
ON CONFLICT ("key") DO NOTHING;
