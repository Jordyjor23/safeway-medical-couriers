"use server";

import { hashPassword } from "better-auth/crypto";
import { redirect } from "next/navigation";
import { consumeActivationToken, recordAuthEvent } from "@/lib/activation";
import { prisma } from "@/lib/db";
import { isStrongPassword, passwordIssues } from "@/lib/password";

export async function activateAccount(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!token) return { error: "This activation link is missing or invalid." };
  if (newPassword !== confirmPassword) return { error: "Passwords do not match." };
  if (!isStrongPassword(newPassword)) return { error: passwordIssues(newPassword).join(" ") };

  const userId = await consumeActivationToken(token);
  if (!userId) return { error: "This activation link is invalid or has expired." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.accountStatus === "TERMINATED") {
    return { error: "This account cannot be activated." };
  }

  await prisma.account.updateMany({
    where: { userId, providerId: "credential" },
    data: { password: await hashPassword(newPassword) },
  });
  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: "ACTIVE",
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      disabled: false,
    },
  });
  await recordAuthEvent({
    actorId: userId,
    actorEmail: user.email,
    action: "user.activated",
    targetId: userId,
  });
  redirect("/login?activated=1");
}
