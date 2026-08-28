"use server";

import { hashPassword } from "better-auth/crypto";
import { revalidatePath } from "next/cache";
import {
  ACTIVATION_EMAIL_FAILED_MESSAGE,
  ACTIVATION_RESEND_FAILED_MESSAGE,
  issueActivation,
  recordAuthEvent,
  revokeUserSessions,
} from "@/lib/activation";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { allocateUsername, createTemporaryPassword, nextScopedId } from "@/lib/ids";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { canAssignRoleKey, canChangeOwnerAssignment } from "@/lib/permissions";
import { attachCredentialAccount, credentialIssuer } from "@/lib/portal-account";
import { requirePermission } from "@/lib/rbac";
import type { AccountStatus, EmployeeStatus, EmploymentClassification } from "@prisma/client";

async function ownerCount() {
  return prisma.userRole.count({ where: { role: { key: "OWNER" } } });
}

async function targetIsOwner(userId: string) {
  const assignment = await prisma.userRole.findFirst({
    where: { userId, role: { key: "OWNER" } },
  });
  return Boolean(assignment);
}

export async function createStaffUser(formData: FormData) {
  const ctx = await requirePermission("users.manage");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const roleKey = String(formData.get("roleKey") ?? "EMPLOYEE");
  const hireDateValue = String(formData.get("hireDate") ?? "");
  const managerId = String(formData.get("managerId") ?? "") || null;
  const employmentStatus = String(formData.get("employmentStatus") ?? "PENDING_ONBOARDING") as EmployeeStatus;
  const requestedUsername = String(formData.get("username") ?? "").trim().toLowerCase();
  const customerId = String(formData.get("customerId") ?? "") || null;

  if (!firstName || !lastName || !email) {
    return { error: "First name, last name, and email are required." };
  }
  if (roleKey === "CUSTOMER" && !customerId) {
    return { error: "Select the customer organization for this client login." };
  }
  if (!canAssignRoleKey(ctx.roles, roleKey)) {
    return { error: "You cannot assign that role." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with that email already exists." };

  if (roleKey === "OWNER") {
    const allowed = canChangeOwnerAssignment({
      actorRoles: ctx.roles,
      targetIsOwner: false,
      ownerCount: await ownerCount(),
      action: "grant",
    });
    if (!allowed) return { error: "You cannot assign the owner role." };
  }

  const issuer = await credentialIssuer();
  if (!issuer) {
    return { error: "Staff accounts cannot be created until an owner sign-in account exists." };
  }

  const username = requestedUsername || (await allocateUsername(firstName, lastName));
  if (await prisma.user.findUnique({ where: { username } })) {
    return { error: "That username is already taken." };
  }

  const isDriver = roleKey === "DRIVER";
  const isCustomer = roleKey === "CUSTOMER";
  const displayId = isCustomer
    ? null
    : await nextScopedId(isDriver ? "DRV" : "EMP");

  const user = await prisma.user.create({
    data: {
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email,
      username,
      phone: phone || null,
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
      data: { userId: user.id, roleId: role.id, createdBy: ctx.user.id },
    });
  }

  if (!isCustomer && displayId) {
    const employee = await prisma.employee.create({
      data: {
        employeeNumber: displayId,
        userId: user.id,
        legalFirstName: firstName,
        legalLastName: lastName,
        email,
        phone: phone || null,
        jobTitle: jobTitle || (isDriver ? "Driver / Courier" : "Employee"),
        department: department || null,
        classification: "W2_EMPLOYEE" as EmploymentClassification,
        hireDate: hireDateValue ? new Date(hireDateValue) : null,
        status: employmentStatus,
        isDriver,
        managerId,
      },
    });
    const checklist = await prisma.onboardingChecklist.create({
      data: { employeeId: employee.id },
    });
    await prisma.onboardingStep.createMany({
      data: ONBOARDING_STEPS.map((key) => ({ checklistId: checklist.id, key })),
    });
    await prisma.newHireReport.create({
      data: { employeeId: employee.id, dateHired: hireDateValue ? new Date(hireDateValue) : null },
    });
  }

  if (isCustomer && customerId) {
    await prisma.customerUser.create({
      data: { customerId, userId: user.id },
    });
  }

  const activation = await issueActivation(user.id, email, `${firstName} ${lastName}`);

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "user.created",
    targetType: "user",
    targetId: user.id,
    metadata: { email, roleKey, username, employeeNumber: displayId, emailSent: activation.emailSent },
  });
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/employees");
  return {
    ok: true as const,
    username,
    employeeNumber: displayId,
    emailSent: activation.emailSent,
    warning: activation.emailSent ? undefined : ACTIVATION_EMAIL_FAILED_MESSAGE,
  };
}

export async function setUserRole(formData: FormData) {
  const ctx = await requirePermission("roles.manage");
  const userId = String(formData.get("userId") ?? "");
  const roleKey = String(formData.get("roleKey") ?? "");
  const action = String(formData.get("action") ?? "") as "grant" | "revoke";
  if (!userId || !roleKey || (action !== "grant" && action !== "revoke")) return;

  if (!canAssignRoleKey(ctx.roles, roleKey)) return;

  const role = await prisma.role.findUnique({ where: { key: roleKey } });
  if (!role) return;

  const owners = await ownerCount();
  const targetOwner = await targetIsOwner(userId);
  if (roleKey === "OWNER") {
    const allowed = canChangeOwnerAssignment({
      actorRoles: ctx.roles,
      targetIsOwner: targetOwner,
      ownerCount: owners,
      action,
    });
    if (!allowed) return;
  }

  if (action === "grant") {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id, createdBy: ctx.user.id },
    });
  } else {
    await prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: `user.role.${action}`,
    targetType: "user",
    targetId: userId,
    metadata: { roleKey },
  });
  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function setAccountStatus(formData: FormData) {
  const ctx = await requirePermission("user.disable");
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "") as AccountStatus;
  if (!userId || userId === ctx.user.id) return;
  if (await targetIsOwner(userId) && (await ownerCount()) <= 1) return;

  const disabled = status !== "ACTIVE" && status !== "PENDING_ACTIVATION";
  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: status,
      disabled,
      lockedUntil: null,
    },
  });
  if (disabled) await revokeUserSessions(userId);
  await recordAuthEvent({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: `user.status.${status.toLowerCase()}`,
    targetId: userId,
  });
  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function terminateUserAccess(formData: FormData) {
  const ctx = await requirePermission("user.disable");
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === ctx.user.id) return;
  if (await targetIsOwner(userId) && (await ownerCount()) <= 1) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: "TERMINATED",
      disabled: true,
      terminatedAt: new Date(),
      terminatedBy: ctx.user.id,
      mustChangePassword: false,
    },
  });
  await prisma.employee.updateMany({
    where: { userId },
    data: { status: "TERMINATED" },
  });
  await revokeUserSessions(userId);
  await prisma.verification.deleteMany({
    where: { value: userId, identifier: { startsWith: "activation:" } },
  });
  await recordAuthEvent({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "user.terminated",
    targetId: userId,
  });
  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function resendActivation(formData: FormData) {
  const ctx = await requirePermission("user.edit");
  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.accountStatus === "TERMINATED") return { error: "Account cannot be activated." };
  if (!user.email.trim()) return { error: "This account does not have an email address." };
  const activation = await issueActivation(user.id, user.email, user.name);
  await recordAuthEvent({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "user.activation.resent",
    targetId: userId,
    metadata: { emailSent: activation.emailSent },
  });
  revalidatePath(`/dashboard/users/${userId}`);
  return {
    ok: true as const,
    emailSent: activation.emailSent,
    warning: activation.emailSent ? undefined : ACTIVATION_RESEND_FAILED_MESSAGE,
  };
}

export async function issueTemporaryPassword(formData: FormData) {
  const ctx = await requirePermission("user.edit");
  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.accountStatus === "TERMINATED") {
    return { error: "A temporary password cannot be issued for this account." };
  }
  const temporaryPassword = createTemporaryPassword();
  await prisma.account.updateMany({
    where: { userId, providerId: "credential" },
    data: { password: await hashPassword(temporaryPassword) },
  });
  await prisma.user.update({
    where: { id: userId },
    data: {
      mustChangePassword: true,
      accountStatus: user.accountStatus === "ACTIVE" ? "ACTIVE" : "PENDING_ACTIVATION",
    },
  });
  await revokeUserSessions(userId);
  await recordAuthEvent({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "user.temp-password.issued",
    targetId: userId,
  });
  revalidatePath(`/dashboard/users/${userId}`);
  return { ok: true as const, temporaryPassword };
}

export async function sendPasswordReset(formData: FormData) {
  const ctx = await requirePermission("user.edit");
  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.accountStatus === "TERMINATED") {
    return { error: "Password reset is not available for this account." };
  }
  const { auth } = await import("@/lib/auth");
  await auth.api.requestPasswordReset({
    body: { email: user.email, redirectTo: "/reset-password" },
  });
  await recordAuthEvent({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "user.password.reset-requested",
    targetId: userId,
  });
  return { ok: true as const };
}

export async function updateUserProfile(userId: string, formData: FormData) {
  const ctx = await requirePermission("user.edit");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (username) {
    const taken = await prisma.user.findFirst({
      where: { username, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim() || undefined,
      phone: phone || null,
      username: username || undefined,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "user.updated",
    targetType: "user",
    targetId: userId,
  });
  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}
