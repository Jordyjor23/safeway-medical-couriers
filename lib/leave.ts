import { prisma } from "@/lib/db";
import type { LeaveBankType, TimeOffStatus, TimeOffType } from "@prisma/client";

export const LEAVE_BANK_TYPES: LeaveBankType[] = ["PTO", "SICK", "VACATION"];

export function leaveBankTypeForRequest(type: TimeOffType): LeaveBankType | null {
  if (type === "PTO" || type === "SICK" || type === "VACATION") return type;
  return null;
}

export async function ensureLeaveBanks(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, classification: true, ptoBalanceHours: true },
  });
  if (!employee || employee.classification !== "W2_EMPLOYEE") return [];

  const existing = await prisma.leaveBank.findMany({ where: { employeeId } });
  const existingTypes = new Set(existing.map((bank) => bank.type));

  for (const type of LEAVE_BANK_TYPES) {
    if (existingTypes.has(type)) continue;
    const initial = type === "PTO" ? Number(employee.ptoBalanceHours) : 0;
    await prisma.leaveBank.create({
      data: { employeeId, type, balanceHours: initial },
    });
    await prisma.leaveLedgerEntry.create({
      data: {
        employeeId,
        bankType: type,
        kind: "INITIAL",
        deltaHours: initial,
        balanceAfter: initial,
        note: type === "PTO" && initial ? "Migrated from legacy PTO balance" : "Initial leave balance",
      },
    });
  }

  return prisma.leaveBank.findMany({ where: { employeeId }, orderBy: { type: "asc" } });
}

export async function getLeaveSummary(employeeId: string) {
  const banks = await ensureLeaveBanks(employeeId);
  if (!banks.length) return [];

  const pending = await prisma.timeOffRequest.findMany({
    where: { employeeId, status: "PENDING", type: { in: ["PTO", "SICK", "VACATION"] } },
    select: { type: true, hours: true },
  });
  const used = await prisma.leaveLedgerEntry.groupBy({
    by: ["bankType"],
    where: { employeeId, kind: "USED" },
    _sum: { deltaHours: true },
  });

  return banks.map((bank) => {
    const pendingHours = pending
      .filter((request) => request.type === bank.type)
      .reduce((sum, request) => sum + Number(request.hours ?? 0), 0);
    const usedRow = used.find((row) => row.bankType === bank.type);
    return {
      type: bank.type,
      availableHours: Number(bank.balanceHours),
      pendingHours,
      usedHours: Math.abs(Number(usedRow?._sum.deltaHours ?? 0)),
    };
  });
}

export async function setLeaveBankBalance({
  employeeId,
  type,
  balanceHours,
  actorUserId,
  note,
}: {
  employeeId: string;
  type: LeaveBankType;
  balanceHours: number;
  actorUserId?: string | null;
  note?: string | null;
}) {
  if (!Number.isFinite(balanceHours) || balanceHours < 0) {
    throw new Error("Leave balance must be zero or greater.");
  }
  await ensureLeaveBanks(employeeId);
  return prisma.$transaction(async (tx) => {
    const bank = await tx.leaveBank.findUnique({ where: { employeeId_type: { employeeId, type } } });
    if (!bank) throw new Error("Leave bank is not available for this worker.");
    const previous = Number(bank.balanceHours);
    const delta = balanceHours - previous;
    const updated = await tx.leaveBank.update({
      where: { id: bank.id },
      data: { balanceHours },
    });
    await tx.leaveLedgerEntry.create({
      data: {
        employeeId,
        bankType: type,
        kind: "ADJUSTMENT",
        deltaHours: delta,
        balanceAfter: balanceHours,
        actorUserId: actorUserId ?? null,
        note: note || "Manual leave balance adjustment",
      },
    });
    if (type === "PTO") {
      await tx.employee.update({ where: { id: employeeId }, data: { ptoBalanceHours: balanceHours } });
    }
    return updated;
  });
}

export async function applyTimeOffDecision({
  requestId,
  status,
  actorUserId,
  managerNote,
}: {
  requestId: string;
  status: TimeOffStatus;
  actorUserId: string;
  managerNote?: string | null;
}) {
  const request = await prisma.timeOffRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Time-off request not found.");

  const bankType = leaveBankTypeForRequest(request.type);
  const hours = Number(request.hours ?? 0);

  if (status === "APPROVED" && bankType && hours <= 0) {
    throw new Error("Paid leave requests require hours before they can be approved.");
  }

  if (bankType) await ensureLeaveBanks(request.employeeId);

  return prisma.$transaction(async (tx) => {
    const current = await tx.timeOffRequest.findUnique({ where: { id: requestId } });
    if (!current) throw new Error("Time-off request not found.");

    if (bankType && current.balanceAppliedAt && status !== "APPROVED") {
      const bank = await tx.leaveBank.findUnique({
        where: { employeeId_type: { employeeId: current.employeeId, type: bankType } },
      });
      if (!bank) throw new Error("Leave bank not found.");
      const restoreHours = Number(current.balanceHoursApplied ?? current.hours ?? 0);
      const nextBalance = Number(bank.balanceHours) + restoreHours;
      await tx.leaveBank.update({ where: { id: bank.id }, data: { balanceHours: nextBalance } });
      await tx.leaveLedgerEntry.create({
        data: {
          employeeId: current.employeeId,
          bankType,
          kind: "RESTORED",
          deltaHours: restoreHours,
          balanceAfter: nextBalance,
          timeOffRequestId: current.id,
          actorUserId,
          note: `Leave restored when request changed to ${status}`,
        },
      });
      if (bankType === "PTO") {
        await tx.employee.update({ where: { id: current.employeeId }, data: { ptoBalanceHours: nextBalance } });
      }
    }

    let balanceAppliedAt = status === "APPROVED" ? current.balanceAppliedAt : null;
    let balanceHoursApplied: number | null =
      status === "APPROVED" && current.balanceHoursApplied !== null
        ? Number(current.balanceHoursApplied)
        : null;

    if (bankType && status === "APPROVED" && !current.balanceAppliedAt) {
      const bank = await tx.leaveBank.findUnique({
        where: { employeeId_type: { employeeId: current.employeeId, type: bankType } },
      });
      if (!bank) throw new Error("Leave bank not found.");
      const requestHours = Number(current.hours ?? 0);
      const currentBalance = Number(bank.balanceHours);
      if (currentBalance < requestHours) {
        throw new Error(`Insufficient ${bankType.toLowerCase()} balance. Available: ${currentBalance} hours.`);
      }
      const nextBalance = currentBalance - requestHours;
      await tx.leaveBank.update({ where: { id: bank.id }, data: { balanceHours: nextBalance } });
      await tx.leaveLedgerEntry.create({
        data: {
          employeeId: current.employeeId,
          bankType,
          kind: "USED",
          deltaHours: -requestHours,
          balanceAfter: nextBalance,
          timeOffRequestId: current.id,
          actorUserId,
          note: "Approved time-off request",
        },
      });
      if (bankType === "PTO") {
        await tx.employee.update({ where: { id: current.employeeId }, data: { ptoBalanceHours: nextBalance } });
      }
      balanceAppliedAt = new Date();
      balanceHoursApplied = requestHours;
    }

    return tx.timeOffRequest.update({
      where: { id: requestId },
      data: {
        status,
        managerNote: managerNote === undefined ? undefined : managerNote,
        decidedBy: ["APPROVED", "DENIED"].includes(status) ? actorUserId : null,
        decidedAt: ["APPROVED", "DENIED"].includes(status) ? new Date() : null,
        balanceAppliedAt,
        balanceHoursApplied,
      },
    });
  });
}
