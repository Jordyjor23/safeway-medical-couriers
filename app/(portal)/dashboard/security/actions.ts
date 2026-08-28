"use server";

import { hashPassword, verifyPassword } from "better-auth/crypto";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isStrongPassword, passwordIssues } from "@/lib/password";
import { requireAuth } from "@/lib/rbac";

export async function changeOwnPassword(formData: FormData) {
  const ctx = await requireAuth();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }
  if (!isStrongPassword(newPassword)) {
    return { error: passwordIssues(newPassword).join(" ") };
  }

  const account = await prisma.account.findFirst({
    where: { userId: ctx.user.id, providerId: "credential" },
  });
  if (!account?.password) {
    return { error: "This account cannot change a password here." };
  }

  const valid = await verifyPassword({ hash: account.password, password: currentPassword });
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  await prisma.account.update({
    where: { id: account.id },
    data: { password: await hashPassword(newPassword) },
  });
  await prisma.user.update({
    where: { id: ctx.user.id },
    data: {
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      accountStatus: ctx.user.accountStatus === "PENDING_ACTIVATION" ? "ACTIVE" : undefined,
    },
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "user.password.changed",
    targetType: "user",
    targetId: ctx.user.id,
  });

  return { ok: true as const };
}
