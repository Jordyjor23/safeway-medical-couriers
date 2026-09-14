import type { DocumentCategory } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import {
  DOCUMENT_ACCESS_INCLUDE,
  canAccessManagedDocument,
  canAssociateApplicant,
  canAssociateContract,
  canAssociateCustomer,
  canAssociateDelivery,
  canAssociateEmployee,
  canAttachDocumentToDelivery,
  canSelfApproveDocument,
  documentsListWhere,
  type DocumentActor,
} from "@/lib/documents/access";
import { prisma } from "@/lib/db";
import { notifyDocumentRejected } from "@/lib/documents/notification-scheduler";

function forbidden() {
  const error = new Error("Not found.");
  error.name = "DocumentAccessError";
  return error;
}

export async function loadManagedDocumentForAccess(documentId: string) {
  const document = await prisma.managedDocument.findUnique({
    where: { id: documentId },
    include: DOCUMENT_ACCESS_INCLUDE,
  });
  if (!document) return null;
  const companyAssignments = document.companyLibrary
    ? await prisma.companyDocumentAssignment.findMany({
        where: { familyKey: document.companyLibrary.familyKey, active: true },
      })
    : [];
  const controlledIds = (document.controlledSources ?? []).map((row) => row.id);
  const controlledAssignments = controlledIds.length
    ? await prisma.companyDocumentAssignment.findMany({
        where: { controlledDocumentId: { in: controlledIds }, active: true },
      })
    : [];
  return { ...document, companyAssignments, controlledAssignments };
}

export async function archiveManagedDocument(args: {
  documentId: string;
  actor: DocumentActor;
  reason?: string;
}) {
  const document = await loadManagedDocumentForAccess(args.documentId);
  if (!document) return { error: "Document not found." };
  if (!canAccessManagedDocument(args.actor, document, "archive")) {
    throw forbidden();
  }

  const updated = await prisma.managedDocument.update({
    where: { id: document.id },
    data: {
      lifecycleStatus: "ARCHIVED",
      status: "ARCHIVED",
      archivedAt: new Date(),
      archivedBy: args.actor.user.id,
      archiveReason: args.reason || null,
    },
  });

  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "document.archived",
    targetType: "document",
    targetId: document.id,
    metadata: { archiveReason: args.reason || null, blobKey: document.blobKey },
  });
  return { document: updated };
}

export async function restoreManagedDocument(args: { documentId: string; actor: DocumentActor }) {
  const document = await loadManagedDocumentForAccess(args.documentId);
  if (!document) return { error: "Document not found." };
  if (!canAccessManagedDocument(args.actor, document, "archive")) {
    throw forbidden();
  }

  const updated = await prisma.managedDocument.update({
    where: { id: document.id },
    data: {
      lifecycleStatus: document.verificationStatus === "VERIFIED" ? "VERIFIED" : "UPLOADED",
      status: "CURRENT",
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
    },
  });

  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "document.restored",
    targetType: "document",
    targetId: document.id,
  });
  return { document: updated };
}

export async function supersedeManagedDocument(args: {
  previousDocumentId: string;
  replacementDocumentId: string;
  actor: DocumentActor;
}) {
  const previous = await loadManagedDocumentForAccess(args.previousDocumentId);
  const replacement = await loadManagedDocumentForAccess(args.replacementDocumentId);
  if (!previous || !replacement) return { error: "Not found." };
  if (!canAccessManagedDocument(args.actor, previous, "view")) {
    throw forbidden();
  }
  const canReplace =
    canAccessManagedDocument(args.actor, replacement, "edit") ||
    replacement.uploadedBy === args.actor.user.id;
  if (!canReplace) {
    throw forbidden();
  }

  await prisma.$transaction([
    prisma.managedDocument.update({
      where: { id: previous.id },
      data: { lifecycleStatus: "SUPERSEDED" },
    }),
    prisma.managedDocument.update({
      where: { id: replacement.id },
      data: { supersedesId: previous.id },
    }),
  ]);

  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "document.superseded",
    targetType: "document",
    targetId: previous.id,
    metadata: { replacementDocumentId: replacement.id },
  });
  return { ok: true as const };
}

export async function verifyManagedDocument(args: { documentId: string; actor: DocumentActor }) {
  const document = await loadManagedDocumentForAccess(args.documentId);
  if (!document) return { error: "Document not found." };
  if (!canSelfApproveDocument(args.actor, document)) {
    throw forbidden();
  }

  const now = new Date();
  const updated = await prisma.managedDocument.update({
    where: { id: document.id },
    data: {
      lifecycleStatus: "VERIFIED",
      verificationStatus: "VERIFIED",
      verifiedAt: now,
      verifiedBy: args.actor.user.id,
      reviewedAt: now,
      reviewedBy: args.actor.user.id,
      approvedAt: now,
      verificationDate: now,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
    },
  });

  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "document.verified",
    targetType: "document",
    targetId: document.id,
  });
  return { document: updated };
}

export async function rejectManagedDocument(args: {
  documentId: string;
  actor: DocumentActor;
  reason?: string;
}) {
  const reason = args.reason?.trim() ?? "";
  if (reason.length < 3) return { error: "A rejection reason is required." };
  const document = await loadManagedDocumentForAccess(args.documentId);
  if (!document) return { error: "Document not found." };
  if (!canAccessManagedDocument(args.actor, document, "verify")) {
    throw forbidden();
  }

  const updated = await prisma.managedDocument.update({
    where: { id: document.id },
    data: {
      lifecycleStatus: "REJECTED",
      verificationStatus: "REJECTED",
      rejectedAt: new Date(),
      rejectedBy: args.actor.user.id,
      reviewedAt: new Date(),
      reviewedBy: args.actor.user.id,
      rejectionReason: reason,
    },
  });

  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "document.rejected",
    targetType: "document",
    targetId: document.id,
    metadata: { rejectionReason: reason },
  });

  try {
    const associatedEmployeeUserIds = (
      await prisma.employee.findMany({
        where: { id: { in: document.employeeLinks.map((link) => link.employeeId) }, userId: { not: null } },
        select: { userId: true },
      })
    )
      .map((employee) => employee.userId)
      .filter((id): id is string => Boolean(id));
    await notifyDocumentRejected({
      documentId: document.id,
      documentType: document.documentType,
      rejectionReason: reason,
      uploadedBy: document.uploadedBy,
      associatedEmployeeUserIds,
    });
  } catch {
    // Rejection must still succeed if reminder delivery fails.
  }

  return { document: updated };
}

export async function associateManagedDocument(args: {
  documentId: string;
  actor: DocumentActor;
  employeeId?: string;
  applicantId?: string;
  applicationId?: string;
  customerId?: string;
  contractId?: string;
  deliveryId?: string;
}) {
  const document = await loadManagedDocumentForAccess(args.documentId);
  if (!document) return { error: "Not found." };
  if (!canAccessManagedDocument(args.actor, document, "edit") && document.uploadedBy !== args.actor.user.id) {
    return { error: "Not found." };
  }

  if (args.employeeId) {
    if (!canAssociateEmployee(args.actor, args.employeeId)) return { error: "Not found." };
    const existing = await prisma.employeeDocument.findFirst({
      where: { employeeId: args.employeeId, documentId: document.id },
    });
    if (!existing) {
      await prisma.employeeDocument.create({
        data: { employeeId: args.employeeId, documentId: document.id },
      });
    }
  }
  if (args.applicationId || args.applicantId) {
    const application = args.applicationId
      ? await prisma.application.findUnique({
          where: { id: args.applicationId },
          select: { id: true, applicantId: true },
        })
      : await prisma.application.findFirst({
          where: { applicantId: args.applicantId },
          orderBy: { createdAt: "desc" },
          select: { id: true, applicantId: true },
        });
    if (!application || !canAssociateApplicant(args.actor, application.applicantId)) {
      return { error: "Not found." };
    }
    const existing = await prisma.applicantDocument.findFirst({
      where: { applicationId: application.id, documentId: document.id },
    });
    if (!existing) {
      await prisma.applicantDocument.create({
        data: { applicationId: application.id, documentId: document.id },
      });
    }
  }
  if (args.customerId) {
    if (!canAssociateCustomer(args.actor, args.customerId)) return { error: "Not found." };
    await prisma.customerDocument.create({
      data: { customerId: args.customerId, documentId: document.id },
    });
  }
  if (args.contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: args.contractId }, select: { customerId: true } });
    if (!contract || !canAssociateContract(args.actor, contract.customerId)) return { error: "Not found." };
    await prisma.contractDocument.create({
      data: { contractId: args.contractId, documentId: document.id },
    });
  }
  if (args.deliveryId) {
    if (!canAttachDocumentToDelivery(document)) {
      return { error: "This document cannot be attached to a delivery." };
    }
    const delivery = await prisma.delivery.findUnique({
      where: { id: args.deliveryId },
      select: { customerId: true, driverEmployeeId: true },
    });
    if (!delivery || !canAssociateDelivery(args.actor, delivery, document)) return { error: "Not found." };
    await prisma.deliveryDocument.create({
      data: { deliveryId: args.deliveryId, documentId: document.id },
    });
  }

  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "document.associated",
    targetType: "document",
    targetId: document.id,
    metadata: {
      employeeId: args.employeeId ?? null,
      applicantId: args.applicantId ?? null,
      applicationId: args.applicationId ?? null,
      customerId: args.customerId ?? null,
      contractId: args.contractId ?? null,
      deliveryId: args.deliveryId ?? null,
    },
  });
  return { ok: true as const };
}

export async function findVisibleDuplicates(args: {
  actor: DocumentActor;
  contentSha256: string;
  excludeId?: string;
}) {
  return prisma.managedDocument.findMany({
    where: {
      AND: [
        documentsListWhere(args.actor),
        { contentSha256: args.contentSha256 },
        args.excludeId ? { id: { not: args.excludeId } } : {},
      ],
    },
    select: { id: true, name: true, createdAt: true, originalFileName: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
}

export async function updateManagedDocumentMetadata(args: {
  documentId: string;
  actor: DocumentActor;
  name?: string;
  category?: DocumentCategory;
  documentType?: string | null;
  effectiveDate?: Date | null;
  expirationDate?: Date | null;
  notes?: string | null;
  isSensitive?: boolean;
  issueDate?: Date | null;
}) {
  const document = await loadManagedDocumentForAccess(args.documentId);
  if (!document) return { error: "Not found." };
  if (!canAccessManagedDocument(args.actor, document, "edit")) {
    return { error: "Not found." };
  }
  const restrictedSelf =
    (args.actor.roles.includes("EMPLOYEE") || args.actor.roles.includes("DRIVER") || args.actor.roles.includes("APPLICANT")) &&
    !args.actor.roles.includes("ADMIN") &&
    !args.actor.roles.includes("OWNER") &&
    !args.actor.roles.includes("HR_RECRUITER") &&
    !args.actor.roles.includes("COMPLIANCE_ADMIN");
  if (restrictedSelf && (args.expirationDate !== undefined || args.issueDate !== undefined)) {
    return { error: "Not found." };
  }
  const before = {
    name: document.name,
    category: document.category,
    documentType: document.documentType,
    effectiveDate: document.effectiveDate,
    expirationDate: document.expirationDate,
    isSensitive: document.isSensitive,
  };
  const updated = await prisma.managedDocument.update({
    where: { id: document.id },
    data: {
      name: args.name?.trim() || document.name,
      category: args.category ?? document.category,
      documentType: args.documentType === undefined ? document.documentType : args.documentType,
      effectiveDate: args.effectiveDate === undefined ? document.effectiveDate : args.effectiveDate,
      expirationDate: args.expirationDate === undefined ? document.expirationDate : args.expirationDate,
      issueDate: args.issueDate === undefined ? document.issueDate : args.issueDate,
      notes: args.notes === undefined ? document.notes : args.notes,
      isSensitive: args.isSensitive ?? document.isSensitive,
    },
  });
  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "document.metadata.changed",
    targetType: "document",
    targetId: document.id,
    metadata: { before, after: args },
  });
  return { document: updated };
}
