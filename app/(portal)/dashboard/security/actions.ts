"use server";

import { verifyPassword } from "better-auth/crypto";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isStrongPassword, passwordIssues } from "@/lib/password";
import { CREDENTIAL_PROVIDER_ID, setCredentialPassword } from "@/lib/portal-account";
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
    where: { userId: ctx.user.id, providerId: CREDENTIAL_PROVIDER_ID },
  });
  if (!account?.password) {
    return { error: "This account cannot change a password here." };
  }

  const valid = await verifyPassword({ hash: account.password, password: currentPassword });
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  await setCredentialPassword(ctx.user.id, newPassword, { revokeSessions: false });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "user.password.changed",
    targetType: "user",
    targetId: ctx.user.id,
  });

  return { ok: true as const };
}
