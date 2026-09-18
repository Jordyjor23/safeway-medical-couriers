-- Workforce scheduling, timecards, leave requests, and internal payroll tracking.
CREATE TYPE "WorkShiftStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'CALLED_OFF');
CREATE TYPE "TimeEntryStatus" AS ENUM ('OPEN', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED');
CREATE TYPE "LeaveType" AS ENUM ('PTO', 'SICK', 'UNPAID', 'BEREAVEMENT', 'JURY_DUTY', 'OTHER');
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');
CREATE TYPE "PayrollRecordStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'PAID', 'VOID');

CREATE TABLE "WorkShift" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "routeName" TEXT,
  "notes" TEXT,
  "status" "WorkShiftStatus" NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkShift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeEntry" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "workDate" TIMESTAMP(3) NOT NULL,
  "clockIn" TIMESTAMP(3),
  "clockOut" TIMESTAMP(3),
  "breakMinutes" INTEGER NOT NULL DEFAULT 0,
  "regularHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "overtimeHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "status" "TimeEntryStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeaveRequest" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "type" "LeaveType" NOT NULL,
  "startsOn" TIMESTAMP(3) NOT NULL,
  "endsOn" TIMESTAMP(3) NOT NULL,
  "hours" DECIMAL(6,2),
  "reason" TEXT,
  "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollRecord" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "regularHours" DECIMAL(7,2) NOT NULL DEFAULT 0,
  "overtimeHours" DECIMAL(7,2) NOT NULL DEFAULT 0,
  "hourlyRate" DECIMAL(10,2),
  "grossPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "reimbursements" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "netPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "PayrollRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "externalPayrollId" TEXT,
  "notes" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkShift_employeeId_startsAt_idx" ON "WorkShift"("employeeId", "startsAt");
CREATE INDEX "WorkShift_startsAt_status_idx" ON "WorkShift"("startsAt", "status");
CREATE INDEX "TimeEntry_employeeId_workDate_idx" ON "TimeEntry"("employeeId", "workDate");
CREATE INDEX "TimeEntry_status_workDate_idx" ON "TimeEntry"("status", "workDate");
CREATE INDEX "LeaveRequest_employeeId_startsOn_idx" ON "LeaveRequest"("employeeId", "startsOn");
CREATE INDEX "LeaveRequest_status_startsOn_idx" ON "LeaveRequest"("status", "startsOn");
CREATE UNIQUE INDEX "PayrollRecord_employeeId_periodStart_periodEnd_key" ON "PayrollRecord"("employeeId", "periodStart", "periodEnd");
CREATE INDEX "PayrollRecord_periodStart_periodEnd_status_idx" ON "PayrollRecord"("periodStart", "periodEnd", "status");

ALTER TABLE "WorkShift" ADD CONSTRAINT "WorkShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
