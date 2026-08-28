"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { ensureSystemRoles } from "@/lib/ensure-rbac";
import { isStrongPassword } from "@/lib/password";
import { setCredentialPassword } from "@/lib/portal-account";

async function assignOwnerRole(userId: string) {
  const ownerRole = await prisma.role.findUnique({ where: { key: "OWNER" } });
  if (!ownerRole) return false;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: ownerRole.id } },
    update: {},
    create: { userId, roleId: ownerRole.id },
  });
  return true;
}

export async function setupOwner(formData: FormData) {
  const setupSecret = String(formData.get("setupSecret") ?? "");
  const expected = process.env.OWNER_SETUP_SECRET;
  if (!expected || setupSecret !== expected) {
    return { error: "Setup is not authorized." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email) return { error: "Name and email are required." };
  if (!isStrongPassword(password)) {
    return { error: "Password does not meet the security requirements." };
  }

  await ensureSystemRoles(prisma);

  const ownerAssignment = await prisma.userRole.findFirst({
    where: { role: { key: "OWNER" } },
    include: { user: true },
  });

  if (ownerAssignment) {
    if (ownerAssignment.user.email !== email) {
      return { error: "Enter the existing owner email to set a new password." };
    }
    await prisma.user.update({
      where: { id: ownerAssignment.userId },
      data: { name, firstName: name.split(" ")[0] ?? name, lastName: name.split(" ").slice(1).join(" ") || null },
    });
    await setCredentialPassword(ownerAssignment.userId, password);
    await writeAuditLog({
      actorId: ownerAssignment.userId,
      actorEmail: email,
      action: "owner.password.recovered",
      targetType: "user",
      targetId: ownerAssignment.userId,
    });
    redirect("/login?recovered=1");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name,
        firstName: name.split(" ")[0] ?? name,
        lastName: name.split(" ").slice(1).join(" ") || null,
      },
    });
    await setCredentialPassword(existingUser.id, password);
    const assigned = await assignOwnerRole(existingUser.id);
    if (!assigned) return { error: "Roles could not be created. Try again." };
    await writeAuditLog({
      actorId: existingUser.id,
      actorEmail: email,
      action: "owner.setup",
      targetType: "user",
      targetId: existingUser.id,
    });
    redirect("/login?recovered=1");
  }

  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-owner-setup", setupSecret);

  const result = await auth.api.signUpEmail({
    body: { name, email, password },
    headers: requestHeaders,
  });

  if (!result || !("user" in result) || !result.user) {
    return { error: "Could not create the owner account. Try a different email." };
  }

  const assigned = await assignOwnerRole(result.user.id);
  if (!assigned) {
    return { error: "Roles could not be created. Try again." };
  }

  await prisma.user.update({
    where: { id: result.user.id },
    data: {
      accountStatus: "ACTIVE",
      disabled: false,
      mustChangePassword: false,
    },
  });

  await writeAuditLog({
    actorId: result.user.id,
    actorEmail: result.user.email,
    action: "owner.setup",
    targetType: "user",
    targetId: result.user.id,
  });

  redirect("/dashboard/security?setup=1");
}
