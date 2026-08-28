"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { nextScopedId } from "@/lib/ids";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { requirePermission } from "@/lib/rbac";
import type { ApplicationStatus, InterviewStatus } from "@prisma/client";

export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
  const ctx = await requirePermission("applicants.edit");
  const current = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { applicant: true, jobOpening: true, employee: true },
  });
  if (!current) return { error: "Application not found." };

  await prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });
  await prisma.applicantStatusHistory.create({
    data: {
      applicationId,
      fromStatus: current.status,
      toStatus: status,
      changedBy: ctx.user.id,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "applicant.status.changed",
    targetType: "application",
    targetId: applicationId,
    metadata: { from: current.status, to: status },
  });

  if (status === "HIRED" && !current.employee) {
    const employee = await prisma.employee.create({
      data: {
        employeeNumber: await nextScopedId("EMP"),
        applicationId: current.id,
        legalFirstName: current.applicant.legalFirstName,
        legalLastName: current.applicant.legalLastName,
        preferredName: current.applicant.preferredName,
        email: current.applicant.email,
        phone: current.applicant.phone,
        jobTitle: current.jobOpening.title,
        department: current.jobOpening.department,
        classification:
          current.jobOpening.workerClassification === "INDEPENDENT_CONTRACTOR"
            ? "INDEPENDENT_CONTRACTOR"
            : "W2_EMPLOYEE",
        hireDate: new Date(),
        status: "PENDING_ONBOARDING",
      },
    });
    const checklist = await prisma.onboardingChecklist.create({
      data: { employeeId: employee.id },
    });
    await prisma.onboardingStep.createMany({
      data: ONBOARDING_STEPS.map((key) => ({
        checklistId: checklist.id,
        key,
      })),
    });
    await prisma.newHireReport.create({
      data: { employeeId: employee.id, dateHired: new Date() },
    });
  }

  revalidatePath("/dashboard/applicants");
  revalidatePath(`/dashboard/applicants/${applicationId}`);
  return { ok: true };
}

export async function addApplicationNote(applicationId: string, formData: FormData) {
  const ctx = await requirePermission("applicants.notes.view");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await prisma.applicationNote.create({
    data: { applicationId, authorId: ctx.user.id, body },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "applicant.note.added",
    targetType: "application",
    targetId: applicationId,
  });
  revalidatePath(`/dashboard/applicants/${applicationId}`);
}

export async function updateInterview(applicationId: string, formData: FormData) {
  const ctx = await requirePermission("applicants.edit");
  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  await prisma.interview.create({
    data: {
      applicationId,
      status: String(formData.get("status") ?? "SCHEDULED") as InterviewStatus,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      location: String(formData.get("location") ?? "") || null,
      interviewer: String(formData.get("interviewer") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  await prisma.application.update({
    where: { id: applicationId },
    data: { interviewStatus: "SCHEDULED" },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "applicant.interview.updated",
    targetType: "application",
    targetId: applicationId,
  });
  revalidatePath(`/dashboard/applicants/${applicationId}`);
}
