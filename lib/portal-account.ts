import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/db";
import { allocateUsername, createTemporaryPassword } from "@/lib/ids";

/** Better Auth 1.7 credential accounts are keyed as issuer `local:credential` + accountId = user.id. */
export const CREDENTIAL_PROVIDER_ID = "credential";
export const CREDENTIAL_ISSUER = "local:credential";

export async function credentialIssuer() {
  const template = await prisma.account.findFirst({
    where: { providerId: CREDENTIAL_PROVIDER_ID },
    select: { id: true },
  });
  return template ? CREDENTIAL_ISSUER : null;
}

export async function setCredentialPassword(
  userId: string,
  password: string,
  options?: { mustChangePassword?: boolean; revokeSessions?: boolean },
) {
  const passwordHash = await hashPassword(password);
  const accounts = await prisma.account.findMany({
    where: { userId, providerId: CREDENTIAL_PROVIDER_ID },
  });
  const canonical =
    accounts.find((account) => account.issuer === CREDENTIAL_ISSUER && account.accountId === userId) ??
    accounts[0];

  if (canonical) {
    const extras = accounts.filter((account) => account.id !== canonical.id);
    if (extras.length) {
      await prisma.account.deleteMany({ where: { id: { in: extras.map((account) => account.id) } } });
    }
    await prisma.account.update({
      where: { id: canonical.id },
      data: {
        issuer: CREDENTIAL_ISSUER,
        accountId: userId,
        password: passwordHash,
      },
    });
  } else {
    await prisma.account.create({
      data: {
        issuer: CREDENTIAL_ISSUER,
        accountId: userId,
        providerId: CREDENTIAL_PROVIDER_ID,
        userId,
        password: passwordHash,
      },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: "ACTIVE",
      disabled: false,
      mustChangePassword: options?.mustChangePassword ?? false,
      lockedUntil: null,
      failedLoginCount: 0,
      passwordChangedAt: new Date(),
    },
  });
  if (options?.revokeSessions !== false) {
    await prisma.session.deleteMany({ where: { userId } });
  }
}

export async function attachCredentialAccount(userId: string, _issuer?: string) {
  await prisma.account.create({
    data: {
      issuer: CREDENTIAL_ISSUER,
      accountId: userId,
      providerId: CREDENTIAL_PROVIDER_ID,
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
