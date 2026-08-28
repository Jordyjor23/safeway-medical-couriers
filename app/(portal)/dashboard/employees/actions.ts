"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { nextScopedId } from "@/lib/ids";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
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
  const hireDateValue = String(formData.get("hireDate") ?? "");
  const hireDate = hireDateValue ? new Date(hireDateValue) : null;
  const employee = await prisma.employee.create({
    data: {
      employeeNumber: await nextScopedId("EMP"),
      legalFirstName: String(formData.get("legalFirstName") ?? "").trim(),
      legalLastName: String(formData.get("legalLastName") ?? "").trim(),
      preferredName: String(formData.get("preferredName") ?? "") || null,
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "") || null,
      jobTitle: String(formData.get("jobTitle") ?? "").trim(),
      department: String(formData.get("department") ?? "") || null,
      classification: String(formData.get("classification") ?? "W2_EMPLOYEE") as EmploymentClassification,
      hireDate,
      status: String(formData.get("status") ?? "PENDING_ONBOARDING") as EmployeeStatus,
    },
  });
  await createOnboardingRecords(employee.id, hireDate);
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "employee.created",
    targetType: "employee",
    targetId: employee.id,
  });
  revalidatePath("/dashboard/employees");
  redirect(`/dashboard/employees/${employee.id}`);
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
