"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createPublicJobId } from "@/lib/ids";
import { requirePermission } from "@/lib/rbac";
import type { EmploymentType, JobStatus, PayType, WorkArrangement, WorkerClassification } from "@prisma/client";

export async function createJob(formData: FormData) {
  const ctx = await requirePermission("jobs.create");
  const publicId = createPublicJobId();
  const job = await prisma.jobOpening.create({
    data: {
      publicId,
      title: String(formData.get("title") ?? "").trim(),
      department: String(formData.get("department") ?? "").trim(),
      categoryId: String(formData.get("categoryId") ?? "") || null,
      employmentType: String(formData.get("employmentType") ?? "FULL_TIME") as EmploymentType,
      workerClassification: String(formData.get("workerClassification") ?? "EMPLOYEE") as WorkerClassification,
      location: String(formData.get("location") ?? "").trim(),
      workArrangement: String(formData.get("workArrangement") ?? "ONSITE") as WorkArrangement,
      payType: String(formData.get("payType") ?? "HOURLY") as PayType,
      compensationNotes: String(formData.get("compensationNotes") ?? "") || null,
      compensationMin: formData.get("compensationMin") ? Number(formData.get("compensationMin")) : null,
      compensationMax: formData.get("compensationMax") ? Number(formData.get("compensationMax")) : null,
      description: String(formData.get("description") ?? ""),
      essentialDuties: String(formData.get("essentialDuties") ?? ""),
      minimumQualifications: String(formData.get("minimumQualifications") ?? ""),
      preferredQualifications: String(formData.get("preferredQualifications") ?? "") || null,
      physicalRequirements: String(formData.get("physicalRequirements") ?? "") || null,
      schedule: String(formData.get("schedule") ?? "") || null,
      requiredCertifications: String(formData.get("requiredCertifications") ?? "") || null,
      requiresDriversLicense: formData.get("requiresDriversLicense") === "on",
      vehicleRequirements: String(formData.get("vehicleRequirements") ?? "") || null,
      backgroundCheckRequired: formData.get("backgroundCheckRequired") === "on",
      mvrRequired: formData.get("mvrRequired") === "on",
      status: "DRAFT",
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
    },
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "job.created",
    targetType: "job",
    targetId: job.id,
  });

  revalidatePath("/careers");
  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs/${job.id}`);
}

export async function updateJob(jobId: string, formData: FormData) {
  const ctx = await requirePermission("jobs.edit");
  await prisma.jobOpening.update({
    where: { id: jobId },
    data: {
      title: String(formData.get("title") ?? "").trim(),
      department: String(formData.get("department") ?? "").trim(),
      categoryId: String(formData.get("categoryId") ?? "") || null,
      employmentType: String(formData.get("employmentType") ?? "FULL_TIME") as EmploymentType,
      workerClassification: String(formData.get("workerClassification") ?? "EMPLOYEE") as WorkerClassification,
      location: String(formData.get("location") ?? "").trim(),
      workArrangement: String(formData.get("workArrangement") ?? "ONSITE") as WorkArrangement,
      payType: String(formData.get("payType") ?? "HOURLY") as PayType,
      compensationNotes: String(formData.get("compensationNotes") ?? "") || null,
      compensationMin: formData.get("compensationMin") ? Number(formData.get("compensationMin")) : null,
      compensationMax: formData.get("compensationMax") ? Number(formData.get("compensationMax")) : null,
      description: String(formData.get("description") ?? ""),
      essentialDuties: String(formData.get("essentialDuties") ?? ""),
      minimumQualifications: String(formData.get("minimumQualifications") ?? ""),
      preferredQualifications: String(formData.get("preferredQualifications") ?? "") || null,
      physicalRequirements: String(formData.get("physicalRequirements") ?? "") || null,
      schedule: String(formData.get("schedule") ?? "") || null,
      requiredCertifications: String(formData.get("requiredCertifications") ?? "") || null,
      requiresDriversLicense: formData.get("requiresDriversLicense") === "on",
      vehicleRequirements: String(formData.get("vehicleRequirements") ?? "") || null,
      backgroundCheckRequired: formData.get("backgroundCheckRequired") === "on",
      mvrRequired: formData.get("mvrRequired") === "on",
      updatedBy: ctx.user.id,
    },
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "job.updated",
    targetType: "job",
    targetId: jobId,
  });
  revalidatePath("/careers");
  revalidatePath("/dashboard/jobs");
}

export async function setJobStatus(jobId: string, status: JobStatus) {
  const ctx = await requirePermission("jobs.publish");
  await prisma.jobOpening.update({
    where: { id: jobId },
    data: {
      status,
      postedAt: status === "PUBLISHED" ? new Date() : undefined,
      updatedBy: ctx.user.id,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: `job.status.${status.toLowerCase()}`,
    targetType: "job",
    targetId: jobId,
  });
  revalidatePath("/careers");
  revalidatePath("/dashboard/jobs");
}
