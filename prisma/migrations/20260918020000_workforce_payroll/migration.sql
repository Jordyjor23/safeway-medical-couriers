-- Workforce scheduling, timekeeping, leave, call-off, and payroll tracking.
-- Additive only: no existing tables or records are dropped.

CREATE TYPE "ShiftStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TimeEntryStatus" AS ENUM ('OPEN', 'SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE "TimeOffType" AS ENUM ('PTO', 'SICK', 'UNPAID', 'BEREAVEMENT', 'OTHER');
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');
CREATE TYPE "CallOffStatus" AS ENUM ('REPORTED', 'ACKNOWLEDGED', 'CANCELLED');
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'PROCESSING', 'FINALIZED', 'PAID');
CREATE TYPE "PayrollEntryStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

ALTER TABLE "Employee"
ADD COLUMN "compensationType" "PayType",
ADD COLUMN "basePayRate" DECIMAL(12,2),
ADD COLUMN "overtimeEligible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "ptoBalanceHours" DECIMAL(8,2) NOT NULL DEFAULT 0;

CREATE TABLE "EmployeeShift" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "breakMinutes" INTEGER NOT NULL DEFAULT 0,
  "assignment" TEXT,
  "location" TEXT,
  "notes" TEXT,
  "status" "ShiftStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeShift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeEntry" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "shiftId" TEXT,
  "clockIn" TIMESTAMP(3) NOT NULL,
  "clockOut" TIMESTAMP(3),
  "breakMinutes" INTEGER NOT NULL DEFAULT 0,
  "status" "TimeEntryStatus" NOT NULL DEFAULT 'OPEN',
  "employeeNote" TEXT,
  "managerNote" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeOffRequest" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "type" "TimeOffType" NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "hours" DECIMAL(8,2),
  "reason" TEXT,
  "status" "TimeOffStatus" NOT NULL DEFAULT 'PENDING',
  "managerNote" TEXT,
  "decidedBy" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CallOffRequest" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "shiftId" TEXT,
  "callOffDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "status" "CallOffStatus" NOT NULL DEFAULT 'REPORTED',
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedBy" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CallOffRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollPeriod" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "startsOn" TIMESTAMP(3) NOT NULL,
  "endsOn" TIMESTAMP(3) NOT NULL,
  "payDate" TIMESTAMP(3) NOT NULL,
  "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'OPEN',
  "createdBy" TEXT,
  "finalizedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollEntry" (
  "id" TEXT NOT NULL,
  "payrollPeriodId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "regularHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "overtimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "regularRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "overtimeRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "grossPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "reimbursements" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "netPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "status" "PayrollEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "externalReference" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeShift_employeeId_startsAt_idx" ON "EmployeeShift"("employeeId", "startsAt");
CREATE INDEX "EmployeeShift_status_startsAt_idx" ON "EmployeeShift"("status", "startsAt");
CREATE INDEX "TimeEntry_employeeId_clockIn_idx" ON "TimeEntry"("employeeId", "clockIn");
CREATE INDEX "TimeEntry_status_clockIn_idx" ON "TimeEntry"("status", "clockIn");
CREATE INDEX "TimeEntry_shiftId_idx" ON "TimeEntry"("shiftId");
CREATE INDEX "TimeOffRequest_employeeId_startDate_idx" ON "TimeOffRequest"("employeeId", "startDate");
CREATE INDEX "TimeOffRequest_status_startDate_idx" ON "TimeOffRequest"("status", "startDate");
CREATE INDEX "CallOffRequest_employeeId_callOffDate_idx" ON "CallOffRequest"("employeeId", "callOffDate");
CREATE INDEX "CallOffRequest_status_callOffDate_idx" ON "CallOffRequest"("status", "callOffDate");
CREATE INDEX "CallOffRequest_shiftId_idx" ON "CallOffRequest"("shiftId");
CREATE INDEX "PayrollPeriod_startsOn_endsOn_idx" ON "PayrollPeriod"("startsOn", "endsOn");
CREATE INDEX "PayrollPeriod_status_payDate_idx" ON "PayrollPeriod"("status", "payDate");
CREATE UNIQUE INDEX "PayrollEntry_payrollPeriodId_employeeId_key" ON "PayrollEntry"("payrollPeriodId", "employeeId");
CREATE INDEX "PayrollEntry_employeeId_idx" ON "PayrollEntry"("employeeId");
CREATE INDEX "PayrollEntry_status_idx" ON "PayrollEntry"("status");

ALTER TABLE "EmployeeShift"
ADD CONSTRAINT "EmployeeShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEntry"
ADD CONSTRAINT "TimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEntry"
ADD CONSTRAINT "TimeEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "EmployeeShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeOffRequest"
ADD CONSTRAINT "TimeOffRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallOffRequest"
ADD CONSTRAINT "CallOffRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallOffRequest"
ADD CONSTRAINT "CallOffRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "EmployeeShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollEntry"
ADD CONSTRAINT "PayrollEntry_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollEntry"
ADD CONSTRAINT "PayrollEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
