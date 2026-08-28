import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/db";
import { allocateUsername, createTemporaryPassword } from "@/lib/ids";

export async function credentialIssuer() {
  const template = await prisma.account.findFirst({
    where: { providerId: "credential" },
    select: { issuer: true },
  });
  return template?.issuer ?? null;
}

export async function attachCredentialAccount(userId: string, issuer: string) {
  await prisma.account.create({
    data: {
      issuer,
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(createTemporaryPassword()),
    },
  });
}

export async function provisionEmployeePortalUser(args: {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  roleKey?: "EMPLOYEE" | "DRIVER";
  actorId: string;
}): Promise<{ error: string } | { userId: string; username: string; linked: boolean }> {
  const email = args.email.trim().toLowerCase();
  if (!email) return { error: "Email is required to create a portal account." };

  const issuer = await credentialIssuer();
  if (!issuer) {
    return { error: "Staff accounts cannot be created until an owner sign-in account exists." };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: args.employeeId },
    select: { id: true, userId: true },
  });
  if (!employee) return { error: "Employee record was not found." };

  if (employee.userId) {
    const existing = await prisma.user.findUnique({ where: { id: employee.userId } });
    if (!existing) return { error: "The linked portal account could not be found." };
    if (existing.accountStatus === "TERMINATED") {
      return { error: "This portal account has been terminated." };
    }
    return { userId: existing.id, username: existing.username ?? "", linked: true as const };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { employee: { select: { id: true } } },
  });

  if (existing) {
    if (existing.accountStatus === "TERMINATED") {
      return { error: "A terminated account already uses that email." };
    }
    if (existing.employee && existing.employee.id !== args.employeeId) {
      return { error: "A portal account with that email is already linked to another employee." };
    }
    await prisma.employee.update({
      where: { id: args.employeeId },
      data: { userId: existing.id },
    });
    return { userId: existing.id, username: existing.username ?? "", linked: true as const };
  }

  const roleKey = args.roleKey ?? "EMPLOYEE";
  const username = await allocateUsername(args.firstName, args.lastName);
  const user = await prisma.user.create({
    data: {
      name: `${args.firstName} ${args.lastName}`.trim(),
      firstName: args.firstName,
      lastName: args.lastName,
      email,
      username,
      phone: args.phone || null,
      emailVerified: true,
      accountStatus: "PENDING_ACTIVATION",
      mustChangePassword: true,
      disabled: false,
    },
  });
  await attachCredentialAccount(user.id, issuer);

  const role = await prisma.role.findUnique({ where: { key: roleKey } });
  if (role) {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id, createdBy: args.actorId },
    });
  }

  await prisma.employee.update({
    where: { id: args.employeeId },
    data: {
      userId: user.id,
      isDriver: roleKey === "DRIVER",
    },
  });

  return { userId: user.id, username, linked: false as const };
}
