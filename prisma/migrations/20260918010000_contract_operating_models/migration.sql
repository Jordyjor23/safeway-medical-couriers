-- Internal financial planning scenarios for contract bids and awards.
CREATE TABLE "ContractOperatingModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contractId" TEXT,
    "annualRevenue" DECIMAL(14,2) NOT NULL,
    "contractMonths" INTEGER NOT NULL DEFAULT 12,
    "routeCount" INTEGER NOT NULL,
    "operatingDaysPerWeek" DECIMAL(5,2) NOT NULL,
    "averageRouteHoursPerDay" DECIMAL(5,2) NOT NULL,
    "reliefCoveragePercent" DECIMAL(5,2) NOT NULL,
    "driverHourlyRate" DECIMAL(8,2) NOT NULL,
    "payrollBurdenPercent" DECIMAL(5,2) NOT NULL,
    "operationsManagerCount" INTEGER NOT NULL,
    "operationsManagerAnnualSalary" DECIMAL(12,2) NOT NULL,
    "dispatcherCount" INTEGER NOT NULL,
    "dispatcherAnnualSalary" DECIMAL(12,2) NOT NULL,
    "activeVehicleCount" INTEGER NOT NULL,
    "reserveVehicleCount" INTEGER NOT NULL,
    "vehicleMonthlyCost" DECIMAL(10,2) NOT NULL,
    "fuelMonthlyPerVehicle" DECIMAL(10,2) NOT NULL,
    "insuranceMonthlyPerVehicle" DECIMAL(10,2) NOT NULL,
    "maintenanceMonthlyPerVehicle" DECIMAL(10,2) NOT NULL,
    "technologyMonthly" DECIMAL(10,2) NOT NULL,
    "complianceMonthly" DECIMAL(10,2) NOT NULL,
    "officeAdminMonthly" DECIMAL(10,2) NOT NULL,
    "otherMonthly" DECIMAL(10,2) NOT NULL,
    "startupOneTimeCosts" DECIMAL(12,2) NOT NULL,
    "accountsReceivableDays" INTEGER NOT NULL,
    "cashReserveMonths" DECIMAL(5,2) NOT NULL,
    "availableStartupCapital" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractOperatingModel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractOperatingModel_contractId_idx" ON "ContractOperatingModel"("contractId");
CREATE INDEX "ContractOperatingModel_updatedAt_idx" ON "ContractOperatingModel"("updatedAt");

ALTER TABLE "ContractOperatingModel"
ADD CONSTRAINT "ContractOperatingModel_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
