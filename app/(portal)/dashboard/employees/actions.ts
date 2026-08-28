"use server";

import { revalidatePath } from "next/cache";
import {
  ACTIVATION_EMAIL_FAILED_MESSAGE,
  issueActivation,
} from "@/lib/activation";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { nextScopedId } from "@/lib/ids";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { provisionEmployeePortalUser } from "@/lib/portal-account";
import { requirePermission } from "@/lib/rbac";
import type {
  EmployeeStatus,
  EmploymentClassification,
  NewHireReportStatus,
  OnboardingStepStatus,
} from "@prisma/client";

async function createOnboardingRecords(employeeId: string, hireDate?: Date | null) {
  const checklist = await prisma.onboardingChecklist.create({
    data: { employeeId },
  });
  await prisma.onboardingStep.createMany({
    data: ONBOARDING_STEPS.map((key) => ({
      checklistId: checklist.id,
      key,
    })),
  });
  await prisma.newHireReport.create({
    data: { employeeId, dateHired: hireDate ?? null },
  });
}

export async function createEmployee(formData: FormData) {
  const ctx = await requirePermission("employees.edit");
  const legalFirstName = String(formData.get("legalFirstName") ?? "").trim();
  const legalLastName = String(formData.get("legalLastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const hireDateValue = String(formData.get("hireDate") ?? "");
  const hireDate = hireDateValue ? new Date(hireDateValue) : null;
  const roleKey = String(formData.get("roleKey") ?? "EMPLOYEE") === "DRIVER" ? "DRIVER" : "EMPLOYEE";

  if (!legalFirstName || !legalLastName || !jobTitle) {
    return { error: "First name, last name, and job title are required." };
  }
  if (!email) {
    return { error: "Email is required to create a portal account." };
  }

  const employee = await prisma.employee.create({
    data: {
      employeeNumber: await nextScopedId(roleKey === "DRIVER" ? "DRV" : "EMP"),
      legalFirstName,
      legalLastName,
      preferredName: String(formData.get("preferredName") ?? "") || null,
      email,
      phone: phone || null,
      jobTitle,
      department: String(formData.get("department") ?? "") || null,
      classification: String(formData.get("classification") ?? "W2_EMPLOYEE") as EmploymentClassification,
      hireDate,
      status: String(formData.get("status") ?? "PENDING_ONBOARDING") as EmployeeStatus,
      isDriver: roleKey === "DRIVER",
    },
  });
  await createOnboardingRecords(employee.id, hireDate);

  const provisioned = await provisionEmployeePortalUser({
    employeeId: employee.id,
    email,
    firstName: legalFirstName,
    lastName: legalLastName,
    phone,
    roleKey,
    actorId: ctx.user.id,
  });
  if ("error" in provisioned) {
    await writeAuditLog({
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: "employee.created",
      targetType: "employee",
      targetId: employee.id,
      metadata: { email, portalError: provisioned.error },
    });
    revalidatePath("/dashboard/employees");
    return {
      ok: true as const,
      employeeId: employee.id,
      emailSent: false as const,
      warning: `${provisioned.error} ${ACTIVATION_EMAIL_FAILED_MESSAGE}`,
    };
  }

  const activation = await issueActivation(
    provisioned.userId,
    email,
    `${legalFirstName} ${legalLastName}`,
  );

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "employee.created",
    targetType: "employee",
    targetId: employee.id,
    metadata: { email, userId: provisioned.userId, emailSent: activation.emailSent },
  });
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/users");
  return {
    ok: true as const,
    employeeId: employee.id,
    username: provisioned.username,
    emailSent: activation.emailSent,
    warning: activation.emailSent ? undefined : ACTIVATION_EMAIL_FAILED_MESSAGE,
  };
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  const ctx = await requirePermission("employees.edit");
  const hireDateValue = String(formData.get("hireDate") ?? "");
  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      legalFirstName: String(formData.get("legalFirstName") ?? "").trim(),
      legalLastName: String(formData.get("legalLastName") ?? "").trim(),
      preferredName: String(formData.get("preferredName") ?? "") || null,
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "") || null,
      jobTitle: String(formData.get("jobTitle") ?? "").trim(),
      department: String(formData.get("department") ?? "") || null,
      classification: String(formData.get("classification") ?? "W2_EMPLOYEE") as EmploymentClassification,
      hireDate: hireDateValue ? new Date(hireDateValue) : null,
      status: String(formData.get("status") ?? "PENDING_ONBOARDING") as EmployeeStatus,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "employee.updated",
    targetType: "employee",
    targetId: employeeId,
  });
  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${employeeId}`);
}

export async function updateOnboardingStep(employeeId: string, formData: FormData) {
  const ctx = await requirePermission("employees.edit");
  const stepId = String(formData.get("stepId") ?? "");
  const status = String(formData.get("status") ?? "NOT_STARTED") as OnboardingStepStatus;
  await prisma.onboardingStep.update({
    where: { id: stepId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "employee.onboarding.updated",
    targetType: "employee",
    targetId: employeeId,
  });
  revalidatePath(`/dashboard/employees/${employeeId}`);
}

export async function addEmployeeTraining(employeeId: string, formData: FormData) {
  const ctx = await requirePermission("employees.edit");
  const expiresValue = String(formData.get("expiresAt") ?? "");
  const completedValue = String(formData.get("completedAt") ?? "");
  await prisma.employeeTraining.create({
    data: {
      employeeId,
      requirementKey: String(formData.get("requirementKey") ?? "custom").trim() || "custom",
      title: String(formData.get("title") ?? "").trim(),
      completedAt: completedValue ? new Date(completedValue) : null,
      expiresAt: expiresValue ? new Date(expiresValue) : null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "employee.training.added",
    targetType: "employee",
    targetId: employeeId,
  });
  revalidatePath(`/dashboard/employees/${employeeId}`);
  revalidatePath("/dashboard/compliance");
}

export async function updateNewHireReport(employeeId: string, formData: FormData) {
  const ctx = await requirePermission("employees.edit");
  const dateHired = String(formData.get("dateHired") ?? "");
  const firstPerformed = String(formData.get("dateServicesFirstPerformed") ?? "");
  await prisma.newHireReport.upsert({
    where: { employeeId },
    update: {
      dateHired: dateHired ? new Date(dateHired) : null,
      dateServicesFirstPerformed: firstPerformed ? new Date(firstPerformed) : null,
      status: String(formData.get("status") ?? "NOT_READY") as NewHireReportStatus,
      confirmationReference: String(formData.get("confirmationReference") ?? "") || null,
    },
    create: {
      employeeId,
      dateHired: dateHired ? new Date(dateHired) : null,
      dateServicesFirstPerformed: firstPerformed ? new Date(firstPerformed) : null,
      status: String(formData.get("status") ?? "NOT_READY") as NewHireReportStatus,
      confirmationReference: String(formData.get("confirmationReference") ?? "") || null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "employee.newhire.updated",
    targetType: "employee",
    targetId: employeeId,
  });
  revalidatePath(`/dashboard/employees/${employeeId}`);
}
