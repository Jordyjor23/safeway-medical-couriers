import { writeAuditLog } from "@/lib/audit";
import { canAccessManagedDocument, type DocumentActor } from "@/lib/documents/access";
import { isDocumentType } from "@/lib/documents/catalog";
import { HIGH_CONFIDENCE_MIN } from "@/lib/documents/extraction/normalize";
import { loadManagedDocumentForAccess } from "@/lib/documents/operations";
import { prisma } from "@/lib/db";

export async function reviewExtractedField(args: {
  actor: DocumentActor;
  fieldId: string;
  action: "ACCEPT" | "EDIT" | "IGNORE";
  value?: string;
}) {
  const field = await prisma.documentExtractedField.findUnique({
    where: { id: args.fieldId },
    include: { document: { include: { employeeLinks: true, customerLinks: true, contractLinks: true, deliveryLinks: true } } },
  });
  const access = field ? await loadManagedDocumentForAccess(field.documentId) : null;
  if (!field || !access || !canAccessManagedDocument(args.actor, access, "edit")) {
    return { error: "Not found." as const };
  }

  const proposed = args.action === "EDIT" ? (args.value ?? "").trim() : field.proposedValue;
  if (args.action === "EDIT" && !proposed) return { error: "Enter a value before accepting the edit." as const };

  const reviewStatus = args.action === "IGNORE" ? "IGNORED" : args.action === "EDIT" ? "EDITED" : "ACCEPTED";
  await prisma.documentExtractedField.update({
    where: { id: field.id },
    data: {
      reviewStatus,
      proposedValue: args.action === "IGNORE" ? field.proposedValue : proposed,
    },
  });

  if (reviewStatus === "ACCEPTED" || reviewStatus === "EDITED") {
    const skipAmbiguousDate = field.ambiguousDate && args.action === "ACCEPT";
    if (!skipAmbiguousDate) {
      await applyMappedDocumentField({
        documentId: field.documentId,
        mapsTo: field.mapsToDocumentField,
        value: proposed,
      });
    }
  }

  await writeAuditLog({
    actorId: args.actor.user.id,
    action:
      args.action === "IGNORE"
        ? "document.field.ignored"
        : args.action === "EDIT"
          ? "document.field.edited"
          : "document.field.accepted",
    targetType: "document",
    targetId: field.documentId,
    metadata: {
      fieldKey: field.fieldKey,
      before: args.action === "EDIT" ? field.proposedValue : null,
    },
  });
  return { ok: true as const };
}

async function applyMappedDocumentField(args: {
  documentId: string;
  mapsTo: string | null;
  value: string;
}) {
  if (!args.mapsTo) return;
  if (args.mapsTo === "name") {
    await prisma.managedDocument.update({ where: { id: args.documentId }, data: { name: args.value } });
    return;
  }
  if (args.mapsTo === "expirationDate" || args.mapsTo === "effectiveDate") {
    const date = new Date(`${args.value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return;
    await prisma.managedDocument.update({
      where: { id: args.documentId },
      data: args.mapsTo === "expirationDate" ? { expirationDate: date } : { effectiveDate: date },
    });
  }
}

export async function acceptSuggestedDocumentType(args: {
  actor: DocumentActor;
  documentId: string;
  accept: boolean;
  documentType?: string;
}) {
  const access = await loadManagedDocumentForAccess(args.documentId);
  if (!access || !canAccessManagedDocument(args.actor, access, "edit")) {
    return { error: "Not found." as const };
  }
  const document = await prisma.managedDocument.findUnique({ where: { id: args.documentId } });
  if (!document) return { error: "Not found." as const };
  if (!args.accept) {
    await prisma.managedDocument.update({
      where: { id: document.id },
      data: { suggestedTypeStatus: "IGNORED" },
    });
    await writeAuditLog({
      actorId: args.actor.user.id,
      action: "document.type.ignored",
      targetType: "document",
      targetId: document.id,
    });
    return { ok: true as const };
  }
  const type = args.documentType || document.suggestedDocumentType;
  if (!type || !isDocumentType(type)) return { error: "Choose a document type." as const };
  await prisma.managedDocument.update({
    where: { id: document.id },
    data: { documentType: type, suggestedTypeStatus: "ACCEPTED" },
  });
  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "document.type.accepted",
    targetType: "document",
    targetId: document.id,
    metadata: { documentType: type },
  });
  return { ok: true as const };
}

export async function acceptHighConfidenceFields(args: {
  actor: DocumentActor;
  documentId: string;
  confirmed: boolean;
}) {
  if (!args.confirmed) return { error: "Confirm that you reviewed each field." as const };
  const access = await loadManagedDocumentForAccess(args.documentId);
  if (!access || !canAccessManagedDocument(args.actor, access, "edit")) {
    return { error: "Not found." as const };
  }
  const fields = await prisma.documentExtractedField.findMany({
    where: { documentId: args.documentId, reviewStatus: "PENDING", confidence: { gte: HIGH_CONFIDENCE_MIN }, ambiguousDate: false },
  });
  for (const field of fields) {
    await reviewExtractedField({ actor: args.actor, fieldId: field.id, action: "ACCEPT" });
  }
  return { ok: true as const, count: fields.length };
}
