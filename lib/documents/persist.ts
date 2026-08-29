import type { DocumentCategory } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { canAccessManagedDocument, type DocumentActor } from "@/lib/documents/access";
import {
  associateManagedDocument,
  loadManagedDocumentForAccess,
  supersedeManagedDocument,
} from "@/lib/documents/operations";
import { isExtractionEnabled } from "@/lib/documents/extraction/provider";
import { prisma } from "@/lib/db";

export async function persistManagedDocument(args: {
  actor: DocumentActor;
  stored: {
    blobKey: string;
    storedFileName: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    contentSha256: string;
  };
  name: string;
  category: DocumentCategory;
  documentType?: string | null;
  effectiveDate?: Date | null;
  expirationDate?: Date | null;
  notes?: string | null;
  isSensitive?: boolean;
  employeeId?: string;
  customerId?: string;
  contractId?: string;
  deliveryId?: string;
  supersedesId?: string;
}) {
  const document = await prisma.managedDocument.create({
    data: {
      name: args.name.trim() || args.stored.originalFileName,
      category: args.category,
      documentType: args.documentType || null,
      blobKey: args.stored.blobKey,
      mimeType: args.stored.mimeType,
      sizeBytes: args.stored.sizeBytes,
      originalFileName: args.stored.originalFileName,
      storedFileName: args.stored.storedFileName,
      contentSha256: args.stored.contentSha256,
      effectiveDate: args.effectiveDate ?? null,
      expirationDate: args.expirationDate ?? null,
      notes: args.notes || null,
      isSensitive: args.isSensitive ?? false,
      uploadedBy: args.actor.user.id,
      lifecycleStatus: "UPLOADED",
      verificationStatus: "UNVERIFIED",
      extractionStatus: isExtractionEnabled() ? "PENDING" : "OCR_DISABLED",
    },
  });

  const linked = await associateManagedDocument({
    documentId: document.id,
    actor: args.actor,
    employeeId: args.employeeId,
    customerId: args.customerId,
    contractId: args.contractId,
    deliveryId: args.deliveryId,
  });
  if (linked && "error" in linked && linked.error) {
    return { error: "Not found." };
  }

  if (args.supersedesId) {
    const previous = await prisma.managedDocument.findUnique({
      where: { id: args.supersedesId },
      include: { employeeLinks: true, customerLinks: true, contractLinks: true, deliveryLinks: true },
    });
    const access = await loadManagedDocumentForAccess(args.supersedesId);
    if (!previous || !access || !canAccessManagedDocument(args.actor, access, "view")) {
      return { error: "Not found." };
    }
    if (!args.employeeId && previous.employeeLinks[0]) {
      await prisma.employeeDocument.create({
        data: { employeeId: previous.employeeLinks[0].employeeId, documentId: document.id },
      });
    }
    if (!args.customerId && previous.customerLinks[0]) {
      await prisma.customerDocument.create({
        data: { customerId: previous.customerLinks[0].customerId, documentId: document.id },
      });
    }
    if (!args.contractId && previous.contractLinks[0]) {
      await prisma.contractDocument.create({
        data: { contractId: previous.contractLinks[0].contractId, documentId: document.id },
      });
    }
    if (!args.deliveryId && previous.deliveryLinks[0]) {
      await prisma.deliveryDocument.create({
        data: { deliveryId: previous.deliveryLinks[0].deliveryId, documentId: document.id },
      });
    }
    await supersedeManagedDocument({
      previousDocumentId: previous.id,
      replacementDocumentId: document.id,
      actor: args.actor,
    });
  }

  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "document.uploaded",
    targetType: "document",
    targetId: document.id,
    metadata: { contentSha256: args.stored.contentSha256, mimeType: args.stored.mimeType },
  });
  return { document };
}
