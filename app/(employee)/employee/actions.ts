"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { leaveBankTypeForRequest } from "@/lib/leave";
import { requirePortal } from "@/lib/rbac";
import { notifyRoles } from "@/lib/notifications";
import { businessDateKey, parseBusinessDate } from "@/lib/workforce-time";

function refreshManagerWorkforce() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/workforce");
}

async function ownEmployee() {
  const ctx = await requirePortal("employee");
  if (!ctx.user.employeeId) throw new Error("Your portal account is not linked to an employee record.");
  return { ctx, employeeId: ctx.user.employeeId };
}

export async function clockIn(formData: FormData) {
  const { ctx, employeeId } = await ownEmployee();
  const existing = await prisma.timeEntry.findFirst({ where: { employeeId, clockOut: null, status: "OPEN" } });
  if (existing) throw new Error("You already have an open timecard.");
  const shiftId = String(formData.get("shiftId") ?? "") || null;
  if (shiftId) {
    const shift = await prisma.employeeShift.findFirst({ where: { id: shiftId, employeeId, status: "PUBLISHED" } });
    if (!shift) throw new Error("That shift is not available for this employee.");
  }
  const entry = await prisma.timeEntry.create({ data: { employeeId, shiftId, clockIn: new Date(), status: "OPEN" } });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "employee.clock_in", targetType: "time_entry", targetId: entry.id });
  refreshManagerWorkforce();
  revalidatePath("/employee/dashboard");
  revalidatePath("/employee/timecards");
  revalidatePath("/dashboard/workforce/timecards");
}

export async function clockOut(entryId: string, formData: FormData) {
  const { ctx, employeeId } = await ownEmployee();
  const entry = await prisma.timeEntry.findFirst({ where: { id: entryId, employeeId, clockOut: null } });
  if (!entry) throw new Error("Open timecard not found.");
  await prisma.timeEntry.update({ where: { id: entry.id }, data: { clockOut: new Date(), breakMinutes: Math.max(0, Number(formData.get("breakMinutes") ?? 0) || 0), employeeNote: String(formData.get("employeeNote") ?? "").trim() || null, status: "SUBMITTED" } });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "employee.clock_out", targetType: "time_entry", targetId: entry.id });
  refreshManagerWorkforce();
  revalidatePath("/employee/dashboard");
  revalidatePath("/employee/timecards");
  revalidatePath("/dashboard/workforce/timecards");
}

export async function requestTimeOff(formData: FormData) {
  const { ctx, employeeId } = await ownEmployee();
  const startDate = parseBusinessDate(String(formData.get("startDate") ?? ""));
  const endDate = parseBusinessDate(String(formData.get("endDate") ?? ""));
  if (!startDate || !endDate || endDate < startDate) throw new Error("Time-off dates are invalid.");
  const hoursRaw = String(formData.get("hours") ?? "");
  const requestType = String(formData.get("type") ?? "PTO") as "PTO" | "SICK" | "VACATION" | "UNPAID" | "BEREAVEMENT" | "OTHER";
  const hours = hoursRaw ? Number(hoursRaw) : 0;
  if (leaveBankTypeForRequest(requestType) && (!Number.isFinite(hours) || hours <= 0)) {
    throw new Error("PTO, sick, and vacation requests require the number of hours.");
  }
  const request = await prisma.timeOffRequest.create({
    data: {
      employeeId,
      type: requestType,
      startDate,
      endDate,
      hours: hoursRaw ? hours : null,
      reason: String(formData.get("reason") ?? "").trim() || null,
    },
  });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "employee.timeoff.requested", targetType: "time_off_request", targetId: request.id });
  await notifyRoles({
    roles: ["OWNER", "ADMIN", "OPERATIONS_MANAGER", "HR_RECRUITER"],
    title: "New time-off request",
    body: "An employee submitted a time-off request that is waiting for review.",
    href: "/dashboard/workforce/time-off",
    dedupeKeyPrefix: `timeoff-request:${request.id}`,
  });
  refreshManagerWorkforce();
  revalidatePath("/employee/time-off");
  revalidatePath("/dashboard/workforce/time-off");
}

export async function cancelTimeOff(requestId: string) {
  const { ctx, employeeId } = await ownEmployee();
  const request = await prisma.timeOffRequest.findFirst({ where: { id: requestId, employeeId, status: "PENDING" } });
  if (!request) throw new Error("Only your pending requests can be cancelled.");
  await prisma.timeOffRequest.update({ where: { id: request.id }, data: { status: "CANCELLED" } });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "employee.timeoff.cancelled", targetType: "time_off_request", targetId: request.id });
  refreshManagerWorkforce();
  revalidatePath("/employee/time-off");
  revalidatePath("/dashboard/workforce/time-off");
}

export async function reportCallOff(formData: FormData) {
  const { ctx, employeeId } = await ownEmployee();
  const shiftId = String(formData.get("shiftId") ?? "") || null;
  let callOffDate = parseBusinessDate(String(formData.get("callOffDate") ?? ""));
  if (shiftId) {
    const shift = await prisma.employeeShift.findFirst({ where: { id: shiftId, employeeId } });
    if (!shift) throw new Error("Shift not found.");
    callOffDate = parseBusinessDate(businessDateKey(shift.startsAt));
  }
  if (!callOffDate) throw new Error("Call-off date is required.");
  const row = await prisma.callOffRequest.create({ data: { employeeId, shiftId, callOffDate, reason: String(formData.get("reason") ?? "").trim() || "Call-off", notes: String(formData.get("notes") ?? "").trim() || null } });
  await writeAuditLog({ actorId: ctx.user.id, actorEmail: ctx.user.email, action: "employee.calloff.reported", targetType: "call_off_request", targetId: row.id });
  await notifyRoles({
    roles: ["OWNER", "ADMIN", "OPERATIONS_MANAGER", "HR_RECRUITER", "DISPATCHER"],
    title: "Employee call-off reported",
    body: "An employee reported a call-off. Review coverage and acknowledge the call-off.",
    href: "/dashboard/workforce/time-off#call-offs",
    dedupeKeyPrefix: `calloff:${row.id}`,
  });
  refreshManagerWorkforce();
  revalidatePath("/employee/time-off");
  revalidatePath("/employee/schedule");
  revalidatePath("/dashboard/workforce/time-off");
}
