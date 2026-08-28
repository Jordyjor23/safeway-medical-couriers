"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export async function updateCareersSettings(formData: FormData) {
  const ctx = await requirePermission("settings.manage");
  await prisma.systemSetting.upsert({
    where: { key: "careers" },
    update: {
      updatedBy: ctx.user.id,
      value: {
        heroHeadline: String(formData.get("heroHeadline") ?? "").trim(),
        heroBody: String(formData.get("heroBody") ?? "").trim(),
        primaryCta: String(formData.get("primaryCta") ?? "").trim(),
        secondaryCta: String(formData.get("secondaryCta") ?? "").trim(),
        accommodationEmail: String(formData.get("accommodationEmail") ?? "").trim(),
        voluntaryEeoEnabled: formData.get("voluntaryEeoEnabled") === "on",
      },
    },
    create: {
      key: "careers",
      updatedBy: ctx.user.id,
      value: {
        heroHeadline: String(formData.get("heroHeadline") ?? "").trim(),
        heroBody: String(formData.get("heroBody") ?? "").trim(),
        primaryCta: String(formData.get("primaryCta") ?? "").trim(),
        secondaryCta: String(formData.get("secondaryCta") ?? "").trim(),
        accommodationEmail: String(formData.get("accommodationEmail") ?? "").trim(),
        voluntaryEeoEnabled: formData.get("voluntaryEeoEnabled") === "on",
      },
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "settings.careers.updated",
    targetType: "setting",
    targetId: "careers",
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/careers");
  revalidatePath("/careers/accessibility");
  redirect("/dashboard/settings?saved=careers");
}

export async function updateNotificationSettings(formData: FormData) {
  const ctx = await requirePermission("settings.manage");
  const raw = String(formData.get("contractExpirationDays") ?? "90,60,30,14,7");
  const contractExpirationDays = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  const applicationRetentionDays = Number(formData.get("applicationRetentionDays") ?? 730);

  await prisma.systemSetting.upsert({
    where: { key: "notifications" },
    update: {
      updatedBy: ctx.user.id,
      value: { contractExpirationDays },
    },
    create: {
      key: "notifications",
      updatedBy: ctx.user.id,
      value: { contractExpirationDays },
    },
  });
  await prisma.systemSetting.upsert({
    where: { key: "retention" },
    update: {
      updatedBy: ctx.user.id,
      value: { applicationRetentionDays },
    },
    create: {
      key: "retention",
      updatedBy: ctx.user.id,
      value: { applicationRetentionDays },
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "settings.notifications.updated",
    targetType: "setting",
    targetId: "notifications",
  });
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=alerts");
}

export async function updateLegalDocument(formData: FormData) {
  const ctx = await requirePermission("settings.manage");
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!slug || !title || !body) return;

  const count = await prisma.legalDocument.count({ where: { slug } });
  await prisma.legalDocument.updateMany({
    where: { slug, isCurrent: true },
    data: { isCurrent: false },
  });
  await prisma.legalDocument.create({
    data: {
      slug,
      title,
      body,
      version: `${count + 1}.0`,
      isCurrent: true,
      reviewNotes: "Updated in portal. Counsel should review before production hiring use.",
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "settings.legal.updated",
    targetType: "legal-document",
    targetId: slug,
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/careers/eeo");
  revalidatePath("/careers/privacy");
  revalidatePath("/careers/accessibility");
  redirect("/dashboard/settings?saved=legal");
}
