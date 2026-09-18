"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { parseBusinessDate } from "@/lib/workforce-time";
import type { PayrollEntryStatus, PayrollPeriodStatus } from "@prisma/client";

function amount(value: FormDataEntryValue | null) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export async function createPayrollPeriod(formData: FormData) {
  const ctx = await requirePermission("payroll.manage");
  const startsOn = parseBusinessDate(String(formData.get("startsOn") ?? ""));
  const endsOn = parseBusinessDate(String(formData.get("endsOn") ?? ""));
  const payDate = parseBusinessDate(String(formData.get("payDate") ?? ""));
  if (!startsOn || !endsOn || !payDate || endsOn < startsOn) throw new Error("Payroll period dates are invalid.");
  const period = await prisma.payrollPeriod.create({
    data: {
      label: String(formData.get("label") ?? "").trim() || `${startsOn.toLocaleDateString()} – ${endsOn.toLocaleDateString()}`,
      startsOn,
      endsOn,
      payDate,
      createdBy: ctx.user.id,
    },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "payroll.period.created", targetType: "payroll_period", targetId: period.id });
  revalidatePath("/dashboard/payroll");
}

export async function setPayrollPeriodStatus(periodId: string, status: PayrollPeriodStatus) {
  const ctx = await requirePermission("payroll.manage");
  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      status,
      finalizedAt: status === "FINALIZED" ? new Date() : undefined,
      paidAt: status === "PAID" ? new Date() : undefined,
    },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: `payroll.period.${status.toLowerCase()}`, targetType: "payroll_period", targetId: periodId });
  revalidatePath("/dashboard/payroll");
}

export async function upsertPayrollEntry(periodId: string, formData: FormData) {
  const ctx = await requirePermission("payroll.manage");
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) throw new Error("Employee is required.");
  const regularHours = amount(formData.get("regularHours"));
  const overtimeHours = amount(formData.get("overtimeHours"));
  const regularRate = amount(formData.get("regularRate"));
  const overtimeRate = amount(formData.get("overtimeRate"));
  const deductions = amount(formData.get("deductions"));
  const reimbursements = amount(formData.get("reimbursements"));
  const grossPay = Math.round((regularHours * regularRate + overtimeHours * overtimeRate) * 100) / 100;
  const netPay = Math.round((grossPay - deductions + reimbursements) * 100) / 100;
  const status = String(formData.get("status") ?? "DRAFT") as PayrollEntryStatus;

  const entry = await prisma.payrollEntry.upsert({
    where: { payrollPeriodId_employeeId: { payrollPeriodId: periodId, employeeId } },
    update: { regularHours, overtimeHours, regularRate, overtimeRate, grossPay, deductions, reimbursements, netPay, status, externalReference: String(formData.get("externalReference") ?? "").trim() || null, notes: String(formData.get("notes") ?? "").trim() || null },
    create: { payrollPeriodId: periodId, employeeId, regularHours, overtimeHours, regularRate, overtimeRate, grossPay, deductions, reimbursements, netPay, status, externalReference: String(formData.get("externalReference") ?? "").trim() || null, notes: String(formData.get("notes") ?? "").trim() || null },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "payroll.entry.saved", targetType: "payroll_entry", targetId: entry.id });
  revalidatePath("/dashboard/payroll");
}

export async function updateEmployeeCompensation(employeeId: string, formData: FormData) {
  const ctx = await requirePermission("payroll.manage");
  const basePayRaw = String(formData.get("basePayRate") ?? "");
  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      compensationType: formData.get("compensationType") ? String(formData.get("compensationType")) as "HOURLY" | "SALARY" | "ROUTE_BASED" | "COMMISSION" : null,
      basePayRate: basePayRaw ? amount(formData.get("basePayRate")) : null,
      overtimeEligible: formData.get("overtimeEligible") === "on",
    },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "employee.compensation.updated", targetType: "employee", targetId: employeeId });
  revalidatePath(`/dashboard/employees/${employeeId}`);
  revalidatePath("/dashboard/payroll");
}
