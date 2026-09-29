-- Carrier/subcontractor network for regional courier and freight capacity.
-- Additive only: no existing customer, contract, delivery, or employee data is changed.

CREATE TYPE "CarrierPartnerStatus" AS ENUM ('PROSPECT', 'ONBOARDING', 'QUALIFIED', 'ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE "CarrierPartnerType" AS ENUM ('COURIER_FLEET', 'FREIGHT_CARRIER', 'OWNER_OPERATOR', 'LOGISTICS_PROVIDER', 'SUBCONTRACTOR');
CREATE TYPE "CarrierAgreementStatus" AS ENUM ('NOT_STARTED', 'REQUESTED', 'UNDER_REVIEW', 'EXECUTED', 'EXPIRED', 'TERMINATED');
CREATE TYPE "CarrierContractStatus" AS ENUM ('PROPOSED', 'APPROVED', 'ACTIVE', 'PAUSED', 'ENDED');

CREATE TABLE "CarrierPartner" (
  "id" TEXT NOT NULL,
  "partnerNumber" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "dba" TEXT,
  "partnerType" "CarrierPartnerType" NOT NULL,
  "status" "CarrierPartnerStatus" NOT NULL DEFAULT 'PROSPECT',
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "website" TEXT,
  "mcNumber" TEXT,
  "dotNumber" TEXT,
  "headquartersCity" TEXT,
  "headquartersState" TEXT,
  "serviceRegions" TEXT,
  "operatingStates" TEXT,
  "equipment" TEXT,
  "capabilities" TEXT,
  "medicalCapabilities" TEXT,
  "availabilityNotes" TEXT,
  "rateNotes" TEXT,
  "w9Received" BOOLEAN NOT NULL DEFAULT false,
  "coiReceived" BOOLEAN NOT NULL DEFAULT false,
  "cargoInsuranceVerified" BOOLEAN NOT NULL DEFAULT false,
  "autoInsuranceVerified" BOOLEAN NOT NULL DEFAULT false,
  "hipaaVerified" BOOLEAN NOT NULL DEFAULT false,
  "bloodbornePathogensVerified" BOOLEAN NOT NULL DEFAULT false,
  "hazmatVerified" BOOLEAN NOT NULL DEFAULT false,
  "backgroundProcessVerified" BOOLEAN NOT NULL DEFAULT false,
  "rateSheetReceived" BOOLEAN NOT NULL DEFAULT false,
  "insuranceExpiration" TIMESTAMP(3),
  "cargoInsuranceExpiration" TIMESTAMP(3),
  "agreementStatus" "CarrierAgreementStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "agreementExpiration" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarrierPartner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarrierContractPartner" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "carrierPartnerId" TEXT NOT NULL,
  "status" "CarrierContractStatus" NOT NULL DEFAULT 'PROPOSED',
  "role" TEXT,
  "serviceScope" TEXT,
  "rateTerms" TEXT,
  "priority" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarrierContractPartner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CarrierPartner_partnerNumber_key" ON "CarrierPartner"("partnerNumber");
CREATE INDEX "CarrierPartner_status_partnerType_idx" ON "CarrierPartner"("status", "partnerType");
CREATE INDEX "CarrierPartner_headquartersState_idx" ON "CarrierPartner"("headquartersState");
CREATE INDEX "CarrierPartner_mcNumber_idx" ON "CarrierPartner"("mcNumber");
CREATE INDEX "CarrierPartner_dotNumber_idx" ON "CarrierPartner"("dotNumber");
CREATE INDEX "CarrierPartner_insuranceExpiration_idx" ON "CarrierPartner"("insuranceExpiration");
CREATE INDEX "CarrierPartner_agreementExpiration_idx" ON "CarrierPartner"("agreementExpiration");

CREATE UNIQUE INDEX "CarrierContractPartner_contractId_carrierPartnerId_key" ON "CarrierContractPartner"("contractId", "carrierPartnerId");
CREATE INDEX "CarrierContractPartner_carrierPartnerId_status_idx" ON "CarrierContractPartner"("carrierPartnerId", "status");
CREATE INDEX "CarrierContractPartner_contractId_status_idx" ON "CarrierContractPartner"("contractId", "status");

ALTER TABLE "CarrierContractPartner"
ADD CONSTRAINT "CarrierContractPartner_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CarrierContractPartner"
ADD CONSTRAINT "CarrierContractPartner_carrierPartnerId_fkey"
FOREIGN KEY ("carrierPartnerId") REFERENCES "CarrierPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
