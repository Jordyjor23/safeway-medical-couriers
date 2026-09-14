"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { convertApplicationToEmployee } from "@/lib/applications/conversion";
import { isApplicationStatus } from "@/lib/applications/status";
import { prisma } from "@/lib/db";
import { requireApplicationEdit, requireApplicationReview } from "@/lib/rbac";
import type { ApplicationStatus, InterviewStatus } from "@prisma/client";

export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus, note?: string) {
  const ctx = await requireApplicationEdit();
  if (!isApplicationStatus(status)) return { error: "Not found." };
  const current = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { applicant: true, jobOpening: true, employee: true },
  });
  if (!current) return { error: "Not found." };

  if (current.status !== status) {
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
        note: note || null,
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
  }

  if (status === "HIRED") {
    await convertApplicationToEmployee({
      applicationId,
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
    });
  }

  revalidatePath("/dashboard/applicants");
  revalidatePath(`/dashboard/applicants/${applicationId}`);
  return { ok: true };
}

export async function addApplicationNote(applicationId: string, formData: FormData) {
  const ctx = await requireApplicationReview();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const visibleToApplicant = String(formData.get("visibleToApplicant") ?? "") === "1";
  await prisma.applicationNote.create({
    data: { applicationId, authorId: ctx.user.id, body, visibleToApplicant },
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
  const ctx = await requireApplicationEdit();
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
