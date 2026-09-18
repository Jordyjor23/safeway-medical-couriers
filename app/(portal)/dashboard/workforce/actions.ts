"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission, requirePortal } from "@/lib/rbac";
import type {
  LeaveRequestStatus,
  LeaveType,
  PayrollRecordStatus,
  TimeEntryStatus,
  WorkShiftStatus,
} from "@prisma/client";

function dateValue(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function numberValue(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function audit(ctx: Awaited<ReturnType<typeof requirePermission>>, action: string, targetType: string, targetId?: string) {
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action,
    targetType,
    targetId,
  });
}

export async function createShift(formData: FormData) {
  const ctx = await requirePermission("workforce.edit");
  const employeeId = String(formData.get("employeeId") ?? "");
  const startsAt = dateValue(formData.get("startsAt"));
  const endsAt = dateValue(formData.get("endsAt"));
  if (!employeeId || !startsAt || !endsAt || endsAt <= startsAt) {
    return { error: "Employee, start, and end times are required, and the shift must end after it starts." };
  }
  const shift = await prisma.workShift.create({
    data: {
      employeeId,
      startsAt,
      endsAt,
      location: String(formData.get("location") ?? "").trim() || null,
      routeName: String(formData.get("routeName") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      status: String(formData.get("status") ?? "PUBLISHED") as WorkShiftStatus,
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
    },
  });
  await audit(ctx, "workforce.shift.created", "work_shift", shift.id);
  revalidatePath("/dashboard/workforce/schedule");
  revalidatePath("/employee/workforce");
  return { ok: true };
}

export async function setShiftStatus(shiftId: string, status: WorkShiftStatus) {
  const ctx = await requirePermission("workforce.edit");
  await prisma.workShift.update({ where: { id: shiftId }, data: { status, updatedBy: ctx.user.id } });
  await audit(ctx, "workforce.shift.status", "work_shift", shiftId);
  revalidatePath("/dashboard/workforce/schedule");
  revalidatePath("/employee/workforce");
}

export async function createTimeEntry(formData: FormData) {
  const ctx = await requirePermission("workforce.edit");
  const employeeId = String(formData.get("employeeId") ?? "");
  const workDate = dateValue(formData.get("workDate"));
  if (!employeeId || !workDate) return { error: "Employee and work date are required." };
  const entry = await prisma.timeEntry.create({
    data: {
      employeeId,
      workDate,
      clockIn: dateValue(formData.get("clockIn")),
      clockOut: dateValue(formData.get("clockOut")),
      breakMinutes: Math.max(0, Math.round(numberValue(formData.get("breakMinutes")))),
      regularHours: Math.max(0, numberValue(formData.get("regularHours"))),
      overtimeHours: Math.max(0, numberValue(formData.get("overtimeHours"))),
      notes: String(formData.get("notes") ?? "").trim() || null,
      status: String(formData.get("status") ?? "SUBMITTED") as TimeEntryStatus,
    },
  });
  await audit(ctx, "workforce.time_entry.created", "time_entry", entry.id);
  revalidatePath("/dashboard/workforce/timecards");
  return { ok: true };
}

export async function setTimeEntryStatus(entryId: string, status: TimeEntryStatus) {
  const ctx = await requirePermission("workforce.edit");
  await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      status,
      approvedAt: status === "APPROVED" || status === "LOCKED" ? new Date() : null,
      approvedBy: status === "APPROVED" || status === "LOCKED" ? ctx.user.id : null,
    },
  });
  await audit(ctx, "workforce.time_entry.status", "time_entry", entryId);
  revalidatePath("/dashboard/workforce/timecards");
  revalidatePath("/employee/workforce");
}

export async function submitLeaveRequest(formData: FormData) {
  const ctx = await requirePortal("employee");
  const employeeId = ctx.user.employeeId;
  if (!employeeId) return { error: "No employee profile is linked to this account." };
  const startsOn = dateValue(formData.get("startsOn"));
  const endsOn = dateValue(formData.get("endsOn"));
  if (!startsOn || !endsOn || endsOn < startsOn) return { error: "Valid start and end dates are required." };
  await prisma.leaveRequest.create({
    data: {
      employeeId,
      type: String(formData.get("type") ?? "PTO") as LeaveType,
      startsOn,
      endsOn,
      hours: formData.get("hours") ? Math.max(0, numberValue(formData.get("hours"))) : null,
      reason: String(formData.get("reason") ?? "").trim() || null,
    },
  });
  revalidatePath("/employee/workforce");
  revalidatePath("/dashboard/workforce/leave");
  return { ok: true };
}

export async function reviewLeaveRequest(requestId: string, status: LeaveRequestStatus, formData?: FormData) {
  const ctx = await requirePermission("workforce.edit");
  await prisma.leaveRequest.update({
    where: { id: requestId },
    data: {
      status,
      reviewedBy: ctx.user.id,
      reviewedAt: new Date(),
      reviewNote: formData ? String(formData.get("reviewNote") ?? "").trim() || null : null,
    },
  });
  await audit(ctx, "workforce.leave.reviewed", "leave_request", requestId);
  revalidatePath("/dashboard/workforce/leave");
  revalidatePath("/employee/workforce");
}

export async function clockIn() {
  const ctx = await requirePortal("employee");
  const employeeId = ctx.user.employeeId;
  if (!employeeId) return { error: "No employee profile is linked to this account." };
  const existing = await prisma.timeEntry.findFirst({
    where: { employeeId, status: "OPEN", clockOut: null },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { error: "You already have an open timecard." };
  const now = new Date();
  await prisma.timeEntry.create({
    data: { employeeId, workDate: now, clockIn: now, status: "OPEN" },
  });
  revalidatePath("/employee/workforce");
  revalidatePath("/dashboard/workforce/timecards");
  return { ok: true };
}

export async function clockOut() {
  const ctx = await requirePortal("employee");
  const employeeId = ctx.user.employeeId;
  if (!employeeId) return { error: "No employee profile is linked to this account." };
  const entry = await prisma.timeEntry.findFirst({
    where: { employeeId, status: "OPEN", clockOut: null },
    orderBy: { createdAt: "desc" },
  });
  if (!entry?.clockIn) return { error: "No open timecard was found." };
  const now = new Date();
  const hours = Math.max(0, (now.getTime() - entry.clockIn.getTime()) / 3_600_000 - entry.breakMinutes / 60);
  await prisma.timeEntry.update({
    where: { id: entry.id },
    data: { clockOut: now, regularHours: Number(hours.toFixed(2)), status: "SUBMITTED" },
  });
  revalidatePath("/employee/workforce");
  revalidatePath("/dashboard/workforce/timecards");
  return { ok: true };
}

export async function upsertPayrollRecord(formData: FormData) {
  const ctx = await requirePermission("payroll.manage");
  const employeeId = String(formData.get("employeeId") ?? "");
  const periodStart = dateValue(formData.get("periodStart"));
  const periodEnd = dateValue(formData.get("periodEnd"));
  if (!employeeId || !periodStart || !periodEnd || periodEnd < periodStart) {
    return { error: "Employee and valid pay-period dates are required." };
  }
  const regularHours = Math.max(0, numberValue(formData.get("regularHours")));
  const overtimeHours = Math.max(0, numberValue(formData.get("overtimeHours")));
  const hourlyRate = formData.get("hourlyRate") ? Math.max(0, numberValue(formData.get("hourlyRate"))) : null;
  const reimbursements = Math.max(0, numberValue(formData.get("reimbursements")));
  const deductions = Math.max(0, numberValue(formData.get("deductions")));
  const calculatedGross = hourlyRate == null ? numberValue(formData.get("grossPay")) : regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5;
  const grossPay = Math.max(0, calculatedGross);
  const netPay = Math.max(0, grossPay + reimbursements - deductions);

  const record = await prisma.payrollRecord.upsert({
    where: { employeeId_periodStart_periodEnd: { employeeId, periodStart, periodEnd } },
    create: {
      employeeId, periodStart, periodEnd, regularHours, overtimeHours, hourlyRate,
      grossPay, reimbursements, deductions, netPay,
      status: String(formData.get("status") ?? "DRAFT") as PayrollRecordStatus,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
    update: {
      regularHours, overtimeHours, hourlyRate, grossPay, reimbursements, deductions, netPay,
      status: String(formData.get("status") ?? "DRAFT") as PayrollRecordStatus,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  await audit(ctx, "payroll.record.upserted", "payroll_record", record.id);
  revalidatePath("/dashboard/payroll");
  revalidatePath("/employee/workforce");
  return { ok: true };
}
