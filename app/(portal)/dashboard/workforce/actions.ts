"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { businessLocalToUtc, parseBusinessDate } from "@/lib/workforce-time";
import type { ShiftStatus, TimeEntryStatus, TimeOffStatus } from "@prisma/client";

function required(value: FormDataEntryValue | null, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function nonNegativeInt(value: FormDataEntryValue | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

export async function createShift(formData: FormData) {
  const ctx = await requirePermission("scheduling.manage");
  const employeeId = required(formData.get("employeeId"), "Employee");
  const startsAt = businessLocalToUtc(required(formData.get("startsAt"), "Start"));
  const endsAt = businessLocalToUtc(required(formData.get("endsAt"), "End"));
  if (!startsAt || !endsAt || endsAt <= startsAt) throw new Error("Shift end must be after the start.");

  const shift = await prisma.employeeShift.create({
    data: {
      employeeId,
      startsAt,
      endsAt,
      breakMinutes: nonNegativeInt(formData.get("breakMinutes")),
      assignment: String(formData.get("assignment") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      status: formData.get("publishNow") === "on" ? "PUBLISHED" : "DRAFT",
      publishedAt: formData.get("publishNow") === "on" ? new Date() : null,
      createdBy: ctx.user.id,
    },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "workforce.shift.created", targetType: "employee_shift", targetId: shift.id });
  revalidatePath("/dashboard/workforce");
  revalidatePath("/dashboard/workforce/schedule");
}

export async function setShiftStatus(shiftId: string, status: ShiftStatus) {
  const ctx = await requirePermission("scheduling.manage");
  await prisma.employeeShift.update({
    where: { id: shiftId },
    data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: `workforce.shift.${status.toLowerCase()}`, targetType: "employee_shift", targetId: shiftId });
  revalidatePath("/dashboard/workforce/schedule");
}

export async function deleteDraftShift(shiftId: string) {
  const ctx = await requirePermission("scheduling.manage");
  const shift = await prisma.employeeShift.findUnique({ where: { id: shiftId }, include: { _count: { select: { timeEntries: true } } } });
  if (!shift) return;
  if (!["DRAFT", "CANCELLED"].includes(shift.status) || shift._count.timeEntries > 0) {
    throw new Error("Only draft/cancelled shifts with no time entries can be deleted.");
  }
  await prisma.employeeShift.delete({ where: { id: shiftId } });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "workforce.shift.deleted", targetType: "employee_shift", targetId: shiftId });
  revalidatePath("/dashboard/workforce/schedule");
}

export async function createManualTimeEntry(formData: FormData) {
  const ctx = await requirePermission("timecards.manage");
  const employeeId = required(formData.get("employeeId"), "Employee");
  const clockIn = businessLocalToUtc(required(formData.get("clockIn"), "Clock in"));
  const clockOutValue = String(formData.get("clockOut") ?? "");
  const clockOut = clockOutValue ? businessLocalToUtc(clockOutValue) : null;
  if (!clockIn || (clockOutValue && !clockOut) || (clockOut && clockOut <= clockIn)) throw new Error("Timecard dates are invalid.");

  const entry = await prisma.timeEntry.create({
    data: {
      employeeId,
      clockIn,
      clockOut,
      breakMinutes: nonNegativeInt(formData.get("breakMinutes")),
      status: clockOut ? "SUBMITTED" : "OPEN",
      managerNote: String(formData.get("managerNote") ?? "").trim() || null,
    },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "workforce.timecard.created", targetType: "time_entry", targetId: entry.id });
  revalidatePath("/dashboard/workforce");
  revalidatePath("/dashboard/workforce/timecards");
}

export async function setTimeEntryStatus(entryId: string, status: TimeEntryStatus) {
  const ctx = await requirePermission("timecards.manage");
  await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      status,
      approvedBy: status === "APPROVED" ? ctx.user.id : null,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: `workforce.timecard.${status.toLowerCase()}`, targetType: "time_entry", targetId: entryId });
  revalidatePath("/dashboard/workforce/timecards");
  revalidatePath("/dashboard/payroll");
}

export async function createTimeOffForEmployee(formData: FormData) {
  const ctx = await requirePermission("timeoff.manage");
  const employeeId = required(formData.get("employeeId"), "Employee");
  const startDate = parseBusinessDate(required(formData.get("startDate"), "Start date"));
  const endDate = parseBusinessDate(required(formData.get("endDate"), "End date"));
  if (!startDate || !endDate || endDate < startDate) throw new Error("Time-off dates are invalid.");
  const hoursValue = String(formData.get("hours") ?? "");
  const request = await prisma.timeOffRequest.create({
    data: {
      employeeId,
      type: required(formData.get("type"), "Type") as "PTO" | "SICK" | "UNPAID" | "BEREAVEMENT" | "OTHER",
      startDate,
      endDate,
      hours: hoursValue ? Number(hoursValue) : null,
      reason: String(formData.get("reason") ?? "").trim() || null,
    },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "workforce.timeoff.created", targetType: "time_off_request", targetId: request.id });
  revalidatePath("/dashboard/workforce/time-off");
}

export async function setTimeOffStatus(requestId: string, status: TimeOffStatus, formData?: FormData) {
  const ctx = await requirePermission("timeoff.manage");
  await prisma.timeOffRequest.update({
    where: { id: requestId },
    data: {
      status,
      managerNote: formData ? String(formData.get("managerNote") ?? "").trim() || null : undefined,
      decidedBy: ["APPROVED", "DENIED"].includes(status) ? ctx.user.id : null,
      decidedAt: ["APPROVED", "DENIED"].includes(status) ? new Date() : null,
    },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: `workforce.timeoff.${status.toLowerCase()}`, targetType: "time_off_request", targetId: requestId });
  revalidatePath("/dashboard/workforce/time-off");
}

export async function recordCallOff(formData: FormData) {
  const ctx = await requirePermission("timeoff.manage");
  const employeeId = required(formData.get("employeeId"), "Employee");
  const callOffDate = parseBusinessDate(required(formData.get("callOffDate"), "Call-off date"));
  if (!callOffDate) throw new Error("Call-off date is invalid.");
  const row = await prisma.callOffRequest.create({
    data: {
      employeeId,
      callOffDate,
      reason: required(formData.get("reason"), "Reason"),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "workforce.calloff.reported", targetType: "call_off_request", targetId: row.id });
  revalidatePath("/dashboard/workforce/time-off");
}

export async function acknowledgeCallOff(callOffId: string) {
  const ctx = await requirePermission("timeoff.manage");
  await prisma.callOffRequest.update({
    where: { id: callOffId },
    data: { status: "ACKNOWLEDGED", acknowledgedBy: ctx.user.id, acknowledgedAt: new Date() },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "workforce.calloff.acknowledged", targetType: "call_off_request", targetId: callOffId });
  revalidatePath("/dashboard/workforce/time-off");
}


export async function updateShift(shiftId: string, formData: FormData) {
  const ctx = await requirePermission("scheduling.manage");
  const employeeId = required(formData.get("employeeId"), "Employee");
  const startsAt = businessLocalToUtc(required(formData.get("startsAt"), "Start"));
  const endsAt = businessLocalToUtc(required(formData.get("endsAt"), "End"));
  if (!startsAt || !endsAt || endsAt <= startsAt) throw new Error("Shift end must be after the start.");
  const current = await prisma.employeeShift.findUnique({ where: { id: shiftId } });
  if (!current) throw new Error("Shift not found.");
  await prisma.employeeShift.update({
    where: { id: shiftId },
    data: {
      employeeId,
      startsAt,
      endsAt,
      breakMinutes: nonNegativeInt(formData.get("breakMinutes")),
      assignment: String(formData.get("assignment") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "workforce.shift.updated",
    targetType: "employee_shift",
    targetId: shiftId,
    metadata: { previousEmployeeId: current.employeeId },
  });
  revalidatePath("/dashboard/workforce/schedule");
  revalidatePath(`/dashboard/workforce/schedule/${shiftId}`);
  revalidatePath("/employee/schedule");
}

export async function updateTimeEntry(entryId: string, formData: FormData) {
  const ctx = await requirePermission("timecards.manage");
  const clockIn = businessLocalToUtc(required(formData.get("clockIn"), "Clock in"));
  const clockOutRaw = String(formData.get("clockOut") ?? "");
  const clockOut = clockOutRaw ? businessLocalToUtc(clockOutRaw) : null;
  if (!clockIn || (clockOutRaw && !clockOut) || (clockOut && clockOut <= clockIn)) {
    throw new Error("Timecard dates are invalid.");
  }
  const current = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!current) throw new Error("Time entry not found.");
  await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      clockIn,
      clockOut,
      breakMinutes: nonNegativeInt(formData.get("breakMinutes")),
      managerNote: String(formData.get("managerNote") ?? "").trim() || null,
      status: clockOut ? "SUBMITTED" : "OPEN",
      approvedBy: null,
      approvedAt: null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "workforce.timecard.updated",
    targetType: "time_entry",
    targetId: entryId,
    metadata: { previousStatus: current.status },
  });
  revalidatePath("/dashboard/workforce/timecards");
  revalidatePath(`/dashboard/workforce/timecards/${entryId}`);
  revalidatePath("/employee/timecards");
}
