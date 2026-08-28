"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import type { DocumentCategory } from "@prisma/client";

export async function uploadBusinessDocument(formData: FormData) {
  const ctx = await requirePermission("documents.upload");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;

  const stored = await put(`private/${crypto.randomUUID()}/${file.name}`, file, {
    access: "private",
    token,
  });

  const document = await prisma.managedDocument.create({
    data: {
      name: String(formData.get("name") ?? file.name),
      category: String(formData.get("category") ?? "CORPORATE") as DocumentCategory,
      blobKey: stored.pathname,
      mimeType: file.type,
      sizeBytes: file.size,
      expirationDate: formData.get("expirationDate") ? new Date(String(formData.get("expirationDate"))) : null,
      notes: String(formData.get("notes") ?? "") || null,
      uploadedBy: ctx.user.id,
    },
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "document.uploaded",
    targetType: "document",
    targetId: document.id,
  });
  revalidatePath("/dashboard/documents");
}

export async function deleteBusinessDocument(formData: FormData) {
  const ctx = await requirePermission("documents.delete");
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return;

  const document = await prisma.managedDocument.findUnique({ where: { id: documentId } });
  if (!document) return;

  try {
    const { del } = await import("@vercel/blob");
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token && document.blobKey) {
      await del(document.blobKey, { token });
    }
  } catch {
    // Keep deleting the tracking record even if blob storage is not configured.
  }

  await prisma.managedDocument.delete({ where: { id: documentId } });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "document.deleted",
    targetType: "document",
    targetId: documentId,
  });
  revalidatePath("/dashboard/documents");
}
