"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isStrongPassword } from "@/lib/password";

export async function setupOwner(formData: FormData) {
  const setupSecret = String(formData.get("setupSecret") ?? "");
  const expected = process.env.OWNER_SETUP_SECRET;
  if (!expected || setupSecret !== expected) {
    return { error: "Setup is not authorized." };
  }

  const ownerCount = await prisma.userRole.count({
    where: { role: { key: "OWNER" } },
  });
  if (ownerCount > 0) {
    return { error: "An owner account already exists." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email) return { error: "Name and email are required." };
  if (!isStrongPassword(password)) {
    return { error: "Password does not meet the security requirements." };
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

  const ownerRole = await prisma.role.findUnique({ where: { key: "OWNER" } });
  if (!ownerRole) {
    return { error: "Roles have not been seeded. Run the database seed and try again." };
  }

  await prisma.userRole.create({
    data: {
      userId: result.user.id,
      roleId: ownerRole.id,
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
