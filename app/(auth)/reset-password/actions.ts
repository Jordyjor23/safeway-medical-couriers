"use server";

import { redirect } from "next/navigation";
import { accountAllowsPasswordReset } from "@/lib/account-status";
import { recordAuthEvent } from "@/lib/activation";
import { prisma } from "@/lib/db";
import { isStrongPassword, passwordIssues } from "@/lib/password";
import { consumePasswordResetToken, resolvePasswordResetToken } from "@/lib/password-reset";
import { setCredentialPassword } from "@/lib/portal-account";

export async function completePasswordReset(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? password);
  if (!token) return { error: "This reset link is missing or invalid. Request a new password reset email." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };
  if (!isStrongPassword(password)) return { error: passwordIssues(password).join(" ") };

  const pending = await resolvePasswordResetToken(token);
  if (!pending) {
    return { error: "This reset link is invalid or has expired. Request a new password reset email." };
  }

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user || !accountAllowsPasswordReset(user)) {
    return { error: "This account cannot reset a password." };
  }

  await setCredentialPassword(user.id, password);
  await consumePasswordResetToken(token);
  await recordAuthEvent({
    actorId: user.id,
    actorEmail: user.email,
    action: "user.password.reset",
    targetId: user.id,
  });
  redirect("/login?reset=1");
}
