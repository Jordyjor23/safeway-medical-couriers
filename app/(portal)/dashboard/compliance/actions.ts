"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { ComplianceTrackingStatus } from "@prisma/client";

export async function upsertComplianceRecord(formData: FormData) {
  const ctx = await requirePermission("compliance.edit");
  const employeeId = String(formData.get("employeeId") ?? "");
  const requirementId = String(formData.get("requirementId") ?? "");
  if (!employeeId || !requirementId) return;

  const completedAt = String(formData.get("completedAt") ?? "");
  const expiresAt = String(formData.get("expiresAt") ?? "");
  await prisma.complianceRecord.upsert({
    where: {
      employeeId_requirementId: { employeeId, requirementId },
    },
    update: {
      status: String(formData.get("status") ?? "MISSING") as ComplianceTrackingStatus,
      completedAt: completedAt ? new Date(completedAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: String(formData.get("notes") ?? "") || null,
    },
    create: {
      employeeId,
      requirementId,
      status: String(formData.get("status") ?? "MISSING") as ComplianceTrackingStatus,
      completedAt: completedAt ? new Date(completedAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "compliance.record.updated",
    targetType: "employee",
    targetId: employeeId,
  });
  revalidatePath("/dashboard/compliance");
  revalidatePath(`/dashboard/employees/${employeeId}`);
}
