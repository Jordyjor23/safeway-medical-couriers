-- Follow-up migration for route-template fields added after the original
-- contract-route migration had already been applied in Preview.

ALTER TABLE "RouteTemplate"
ADD COLUMN IF NOT EXISTS "requiredDocumentTypes" TEXT;

ALTER TABLE "EmployeeShift"
ADD COLUMN IF NOT EXISTS "deliveryId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeShift_deliveryId_key"
ON "EmployeeShift"("deliveryId");

CREATE INDEX IF NOT EXISTS "EmployeeShift_deliveryId_idx"
ON "EmployeeShift"("deliveryId");

DO $$
BEGIN
  ALTER TABLE "EmployeeShift"
  ADD CONSTRAINT "EmployeeShift_deliveryId_fkey"
  FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
