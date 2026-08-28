"use server";

import { redirect } from "next/navigation";
import { consumeActivationToken, recordAuthEvent, resolveActivationToken } from "@/lib/activation";
import { prisma } from "@/lib/db";
import { isStrongPassword, passwordIssues } from "@/lib/password";
import { setCredentialPassword } from "@/lib/portal-account";

export async function activateAccount(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!token) return { error: "This activation link is missing or invalid." };
  if (newPassword !== confirmPassword) return { error: "Passwords do not match." };
  if (!isStrongPassword(newPassword)) return { error: passwordIssues(newPassword).join(" ") };

  const pending = await resolveActivationToken(token);
  if (!pending) return { error: "This activation link is invalid or has expired." };

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user || user.accountStatus === "TERMINATED") {
    return { error: "This account cannot be activated." };
  }

  await setCredentialPassword(user.id, newPassword);
  await consumeActivationToken(token);
  await recordAuthEvent({
    actorId: user.id,
    actorEmail: user.email,
    action: "user.activated",
    targetId: user.id,
  });
  redirect("/login?activated=1");
}
