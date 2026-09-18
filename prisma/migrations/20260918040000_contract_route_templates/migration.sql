-- Reusable route templates connect contracts, customers, couriers, and deliveries.
-- Additive only: existing deliveries remain valid with nullable links.

CREATE TYPE "RouteTemplateScope" AS ENUM ('GENERIC', 'CONTRACT');

CREATE TABLE "RouteTemplate" (
  "id" TEXT NOT NULL,
  "templateCode" TEXT NOT NULL,
  "scope" "RouteTemplateScope" NOT NULL DEFAULT 'GENERIC',
  "name" TEXT NOT NULL,
  "contractId" TEXT,
  "customerId" TEXT,
  "sourceTemplateId" TEXT,
  "pickupBusinessName" TEXT,
  "pickupAddress" TEXT,
  "deliveryBusinessName" TEXT,
  "deliveryAddress" TEXT,
  "pickupTimeLocal" TEXT,
  "deliverByTimeLocal" TEXT,
  "operatingDays" TEXT,
  "shipmentType" TEXT,
  "temperatureRequired" TEXT,
  "chainOfCustodyRequired" BOOLEAN NOT NULL DEFAULT false,
  "proofOfDeliveryRequired" BOOLEAN NOT NULL DEFAULT true,
  "customerInstructions" TEXT,
  "handlingInstructions" TEXT,
  "requiredTrainingKeys" TEXT,
  "requiredCertificationNames" TEXT,
  "requiredDocumentTypes" TEXT,
  "vehicleRequirement" TEXT,
  "estimatedRouteHours" DECIMAL(6,2),
  "routePay" DECIMAL(10,2),
  "primaryDriverEmployeeId" TEXT,
  "backupDriverEmployeeId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RouteTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Delivery"
ADD COLUMN "contractId" TEXT,
ADD COLUMN "routeTemplateId" TEXT,
ADD COLUMN "pickupBusinessName" TEXT,
ADD COLUMN "deliveryBusinessName" TEXT;

CREATE UNIQUE INDEX "RouteTemplate_templateCode_key" ON "RouteTemplate"("templateCode");
CREATE INDEX "RouteTemplate_scope_active_idx" ON "RouteTemplate"("scope", "active");
CREATE INDEX "RouteTemplate_contractId_active_idx" ON "RouteTemplate"("contractId", "active");
CREATE INDEX "RouteTemplate_customerId_idx" ON "RouteTemplate"("customerId");
CREATE INDEX "RouteTemplate_primaryDriverEmployeeId_idx" ON "RouteTemplate"("primaryDriverEmployeeId");
CREATE INDEX "RouteTemplate_backupDriverEmployeeId_idx" ON "RouteTemplate"("backupDriverEmployeeId");

CREATE INDEX "Delivery_contractId_status_idx" ON "Delivery"("contractId", "status");
CREATE INDEX "Delivery_routeTemplateId_status_idx" ON "Delivery"("routeTemplateId", "status");

ALTER TABLE "RouteTemplate"
ADD CONSTRAINT "RouteTemplate_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteTemplate"
ADD CONSTRAINT "RouteTemplate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RouteTemplate"
ADD CONSTRAINT "RouteTemplate_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "RouteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RouteTemplate"
ADD CONSTRAINT "RouteTemplate_primaryDriverEmployeeId_fkey" FOREIGN KEY ("primaryDriverEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RouteTemplate"
ADD CONSTRAINT "RouteTemplate_backupDriverEmployeeId_fkey" FOREIGN KEY ("backupDriverEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Delivery"
ADD CONSTRAINT "Delivery_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Delivery"
ADD CONSTRAINT "Delivery_routeTemplateId_fkey" FOREIGN KEY ("routeTemplateId") REFERENCES "RouteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
