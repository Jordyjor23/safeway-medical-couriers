import { randomUUID } from "node:crypto";
import type { CompanyAssignmentAction, CompanyAssignmentAudience, CompanyDocumentPurpose, CompanyLibraryCategory } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import {
  COMPANY_ACKNOWLEDGMENT_TEXT,
  COMPANY_OWNER_ENTITY,
  nextRevision,
  purposeToStorageCategory,
} from "@/lib/compliance/library-catalog";
import {
  actorHasCompanyAssignment,
  canAccessAssignedCompanyDocument,
  canManageCompanyLibrary,
  type CompanyAssignmentRecord,
  type CompanyLibraryActor,
} from "@/lib/compliance/library-access";
import { prisma } from "@/lib/db";
import { isDocumentType } from "@/lib/documents/catalog";
import { persistManagedDocument } from "@/lib/documents/persist";
import { documentMaxBytes } from "@/lib/documents/types";
import { validateDocumentFile } from "@/lib/documents/validate";
import { scanUploadedFile, shouldRejectUploadForMalware } from "@/lib/documents/malware";
import type { DocumentActor } from "@/lib/documents/access";
import { DocumentStorageError, isPrivateStorageConfigured, storePrivateFile } from "@/lib/storage";

function optionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function companyActorFromDocumentActor(actor: DocumentActor): Promise<CompanyLibraryActor> {
  const employee = actor.user.employeeId
    ? await prisma.employee.findUnique({ where: { id: actor.user.employeeId }, select: { isDriver: true } })
    : null;
  const applications = actor.user.applicantId
    ? await prisma.application.findMany({
        where: { applicantId: actor.user.applicantId },
        select: { jobOpeningId: true },
      })
    : [];
  return {
    roles: actor.roles,
    employeeId: actor.user.employeeId,
    applicantId: actor.user.applicantId,
    isDriver: Boolean(employee?.isDriver || actor.roles.includes("DRIVER")),
    jobOpeningIds: applications.map((row) => row.jobOpeningId),
  };
}

export async function loadCompanyAssignments(familyKey: string) {
  return prisma.companyDocumentAssignment.findMany({
    where: { familyKey, active: true },
  });
}

export async function uploadCompanyLibraryDocument(args: {
  actor: DocumentActor;
  formData: FormData;
}) {
  if (!canManageCompanyLibrary(args.actor.roles)) {
    return { error: "Not found." };
  }
  if (!isPrivateStorageConfigured()) {
    return { error: "Document storage is not configured." };
  }
  const file = args.formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > documentMaxBytes()) {
    return { error: `The file exceeds the ${Math.floor(documentMaxBytes() / (1024 * 1024))} MB limit.` };
  }
  const validation = await validateDocumentFile(file);
  if (!validation.ok) return { error: validation.error };
  const scan = await scanUploadedFile({
    sizeBytes: validation.sizeBytes,
    mimeType: validation.mimeType,
    contentSha256: validation.contentSha256,
  });
  if (shouldRejectUploadForMalware(scan)) {
    return { error: "The file could not be accepted." };
  }

  const purpose = String(args.formData.get("purpose") ?? "REFERENCE") as CompanyDocumentPurpose;
  const libraryCategory = String(args.formData.get("libraryCategory") ?? "GENERAL_COMPLIANCE") as CompanyLibraryCategory;
  const supersedesId = String(args.formData.get("supersedesId") ?? "").trim();
  let familyKey = String(args.formData.get("familyKey") ?? "").trim() || randomUUID();
  let revision = String(args.formData.get("revision") ?? "").trim() || "1.0";
  let previousDocumentId: string | undefined;

  if (supersedesId) {
    const previous = await prisma.companyDocument.findUnique({
      where: { id: supersedesId },
      include: { document: true },
    });
    if (!previous) return { error: "Not found." };
    familyKey = previous.familyKey;
    revision = nextRevision(previous.revision);
    previousDocumentId = previous.documentId;
  }

  try {
    const stored = await storePrivateFile(file);
    const persisted = await persistManagedDocument({
      actor: args.actor,
      malwareScan: scan,
      stored,
      name: String(args.formData.get("title") ?? stored.originalFileName),
      category: purposeToStorageCategory(purpose),
      documentType: isDocumentType(String(args.formData.get("documentType") ?? ""))
        ? String(args.formData.get("documentType"))
        : null,
      effectiveDate: optionalDate(args.formData.get("effectiveDate")),
      notes: String(args.formData.get("description") ?? "") || null,
      isSensitive: String(args.formData.get("isSensitive") ?? "") === "1" || libraryCategory === "PHI" || libraryCategory === "HR",
      supersedesId: previousDocumentId,
    });
    if ("error" in persisted && persisted.error) return { error: persisted.error };
    if (!persisted.document) return { error: "The document could not be uploaded." };

    await prisma.managedDocument.update({
      where: { id: persisted.document.id },
      data: {
        ownerEntity: COMPANY_OWNER_ENTITY,
        ownerId: familyKey,
        policyDomain: "COMPLIANCE",
      },
    });

    const companyDocument = await prisma.companyDocument.create({
      data: {
        documentId: persisted.document.id,
        familyKey,
        title: String(args.formData.get("title") ?? stored.originalFileName).trim(),
        description: String(args.formData.get("description") ?? "").trim() || null,
        documentNumber: String(args.formData.get("documentNumber") ?? "").trim() || null,
        revision,
        purpose,
        libraryCategory,
        publicationStatus: "DRAFT",
        effectiveDate: optionalDate(args.formData.get("effectiveDate")),
        reviewDate: optionalDate(args.formData.get("reviewDate")),
        responsibleRole: String(args.formData.get("responsibleRole") ?? "").trim() || "COMPLIANCE_ADMIN",
        createdBy: args.actor.user.id,
      },
    });

    if (supersedesId) {
      await prisma.companyDocument.update({
        where: { id: supersedesId },
        data: { publicationStatus: "SUPERSEDED" },
      });
    }

    await writeAuditLog({
      actorId: args.actor.user.id,
      action: supersedesId ? "company_document.version_created" : "company_document.uploaded",
      targetType: "company_document",
      targetId: companyDocument.id,
      metadata: { familyKey, documentId: persisted.document.id, revision, purpose, libraryCategory },
    });

    return { ok: true as const, companyDocumentId: companyDocument.id, documentId: persisted.document.id };
  } catch (error) {
    if (error instanceof DocumentStorageError) return { error: error.message };
    return { error: "The document could not be uploaded. Try again." };
  }
}

export async function publishCompanyDocument(args: { actor: DocumentActor; companyDocumentId: string }) {
  if (!canManageCompanyLibrary(args.actor.roles)) return { error: "Not found." };
  const current = await prisma.companyDocument.findUnique({ where: { id: args.companyDocumentId } });
  if (!current) return { error: "Not found." };
  await prisma.companyDocument.update({
    where: { id: current.id },
    data: { publicationStatus: "ACTIVE", publishedAt: new Date(), publishedBy: args.actor.user.id },
  });
  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "company_document.activated",
    targetType: "company_document",
    targetId: current.id,
    metadata: { familyKey: current.familyKey },
  });
  return { ok: true as const };
}

export async function archiveCompanyDocument(args: { actor: DocumentActor; companyDocumentId: string }) {
  if (!canManageCompanyLibrary(args.actor.roles)) return { error: "Not found." };
  const current = await prisma.companyDocument.findUnique({ where: { id: args.companyDocumentId } });
  if (!current) return { error: "Not found." };
  await prisma.companyDocument.update({
    where: { id: current.id },
    data: { publicationStatus: "ARCHIVED" },
  });
  await prisma.managedDocument.update({
    where: { id: current.documentId },
    data: { lifecycleStatus: "ARCHIVED", archivedAt: new Date(), archivedBy: args.actor.user.id },
  });
  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "company_document.archived",
    targetType: "company_document",
    targetId: current.id,
  });
  return { ok: true as const };
}

export async function assignCompanyDocument(args: {
  actor: DocumentActor;
  familyKey: string;
  companyDocumentId?: string;
  action: CompanyAssignmentAction;
  audience: CompanyAssignmentAudience;
  roleKey?: string;
  employeeId?: string;
  jobOpeningId?: string;
  requirementId?: string;
}) {
  if (!canManageCompanyLibrary(args.actor.roles)) return { error: "Not found." };
  const created = await prisma.companyDocumentAssignment.create({
    data: {
      familyKey: args.familyKey,
      companyDocumentId: args.companyDocumentId ?? null,
      action: args.action,
      audience: args.audience,
      roleKey: args.roleKey || null,
      employeeId: args.employeeId || null,
      jobOpeningId: args.jobOpeningId || null,
      requirementId: args.requirementId || null,
      assignedById: args.actor.user.id,
    },
  });
  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "company_document.assigned",
    targetType: "company_document_assignment",
    targetId: created.id,
    metadata: { familyKey: args.familyKey, action: args.action, audience: args.audience },
  });
  return { ok: true as const, assignmentId: created.id };
}

export async function acknowledgeCompanyDocument(args: {
  actor: DocumentActor;
  companyDocumentId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const companyDocument = await prisma.companyDocument.findUnique({
    where: { id: args.companyDocumentId },
    include: { document: true },
  });
  if (!companyDocument) return { error: "Not found." };
  const assignments = await loadCompanyAssignments(companyDocument.familyKey);
  const libraryActor = await companyActorFromDocumentActor(args.actor);
  if (
    !canAccessAssignedCompanyDocument({
      roles: args.actor.roles,
      publicationStatus: companyDocument.publicationStatus,
      assignments,
      actor: libraryActor,
      action: "acknowledge",
    })
  ) {
    return { error: "Not found." };
  }

  const existing = await prisma.companyDocumentAcknowledgment.findUnique({
    where: {
      userId_companyDocumentId: { userId: args.actor.user.id, companyDocumentId: companyDocument.id },
    },
  });
  if (existing) return { ok: true as const, acknowledgmentId: existing.id, reused: true as const };

  const created = await prisma.companyDocumentAcknowledgment.create({
    data: {
      companyDocumentId: companyDocument.id,
      documentId: companyDocument.documentId,
      documentRevision: companyDocument.revision,
      contentSha256: companyDocument.document.contentSha256 ?? "",
      userId: args.actor.user.id,
      employeeId: args.actor.user.employeeId ?? null,
      applicantId: args.actor.user.applicantId ?? null,
      acknowledgmentText: COMPANY_ACKNOWLEDGMENT_TEXT,
      ipAddress: args.ipAddress ?? null,
      userAgent: args.userAgent ?? null,
    },
  });
  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "company_document.acknowledged",
    targetType: "company_document",
    targetId: companyDocument.id,
    metadata: {
      documentId: companyDocument.documentId,
      revision: companyDocument.revision,
      contentSha256: companyDocument.document.contentSha256,
    },
  });
  return { ok: true as const, acknowledgmentId: created.id, reused: false as const };
}

export async function listAssignedCompanyDocuments(actor: DocumentActor) {
  const libraryActor = await companyActorFromDocumentActor(actor);
  const documents = await prisma.companyDocument.findMany({
    where: { publicationStatus: { in: ["ACTIVE", "SUPERSEDED"] } },
    include: { document: true, acknowledgments: { where: { userId: actor.user.id } } },
    orderBy: { title: "asc" },
  });
  const families = [...new Set(documents.map((row) => row.familyKey))];
  const assignments = families.length
    ? await prisma.companyDocumentAssignment.findMany({
        where: { familyKey: { in: families }, active: true },
      })
    : [];
  const byFamily = new Map<string, CompanyAssignmentRecord[]>();
  for (const assignment of assignments) {
    const list = byFamily.get(assignment.familyKey) ?? [];
    list.push(assignment);
    byFamily.set(assignment.familyKey, list);
  }
  return documents
    .filter((row) =>
      canAccessAssignedCompanyDocument({
        roles: actor.roles,
        publicationStatus: row.publicationStatus,
        assignments: byFamily.get(row.familyKey),
        actor: libraryActor,
      }),
    )
    .map((row) => ({
      ...row,
      assignments: byFamily.get(row.familyKey) ?? [],
      canAcknowledge: actorHasCompanyAssignment(byFamily.get(row.familyKey), libraryActor, [
        "READ_AND_ACKNOWLEDGE",
        "SIGN",
      ]),
    }));
}

export function companyDocumentIsImmutable(publicationStatus: string) {
  return publicationStatus === "ACTIVE" || publicationStatus === "SUPERSEDED" || publicationStatus === "ARCHIVED";
}
