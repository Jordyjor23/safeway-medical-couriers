import type { CompanyAssignmentAction, CompanyAssignmentAudience } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { canManageCompanyLibrary } from "@/lib/compliance/library-access";
import {
  APPROVED_SERVICE_MATRIX,
  CONTROLLED_REGISTER_SEEDS,
  IMPLEMENTATION_TASK_SEEDS,
  identifyOfficialSourcePackage,
  officialSourceHashMatches,
  officialSourcePackageByKey,
  sourcePackageKeyForControlledId,
  type OfficialSourcePackageKey,
  controlledDocumentVisibleToAssignees,
} from "@/lib/compliance/register-catalog";
import { prisma } from "@/lib/db";
import type { DocumentActor } from "@/lib/documents/access";

export async function seedComplianceRegister() {
  for (const row of CONTROLLED_REGISTER_SEEDS) {
    await prisma.controlledDocument.upsert({
      where: { controlledDocumentId: row.controlledDocumentId },
      create: {
        controlledDocumentId: row.controlledDocumentId,
        title: row.title,
        description: row.description,
        category: row.category,
        documentType: row.documentType,
        ownerRole: row.ownerRole,
        approvalAuthority: row.approvalAuthority,
        sectionReference: row.sectionReference ?? row.controlledDocumentId,
        packageKey: sourcePackageKeyForControlledId(row.controlledDocumentId),
        status: "PENDING_SOURCE",
        active: false,
        revision: "1.0",
        metadata: {
          awaitingMaster: true,
          packageKey: sourcePackageKeyForControlledId(row.controlledDocumentId),
          expectedSha256:
            officialSourcePackageByKey(sourcePackageKeyForControlledId(row.controlledDocumentId))?.expectedSha256 ?? null,
        },
      },
      update: {
        title: row.title,
        description: row.description,
        category: row.category,
        documentType: row.documentType,
        ownerRole: row.ownerRole,
        approvalAuthority: row.approvalAuthority,
        sectionReference: row.sectionReference ?? row.controlledDocumentId,
        packageKey: sourcePackageKeyForControlledId(row.controlledDocumentId),
      },
    });
  }

  const byKey = new Map(
    (await prisma.controlledDocument.findMany({ select: { id: true, controlledDocumentId: true } })).map((row) => [
      row.controlledDocumentId,
      row.id,
    ]),
  );

  for (const task of IMPLEMENTATION_TASK_SEEDS) {
    const sourceId = byKey.get(task.sourceControlledDocumentId) ?? null;
    const existing = await prisma.complianceImplementationTask.findUnique({ where: { key: task.key } });
    if (existing) {
      if (existing.status === "OPEN") {
        await prisma.complianceImplementationTask.update({
          where: { id: existing.id },
          data: {
            title: task.title,
            description: task.description,
            category: task.category,
            assignedRole: task.assignedRole,
            sourceControlledDocumentId: sourceId,
          },
        });
      }
      continue;
    }
    await prisma.complianceImplementationTask.create({
      data: {
        key: task.key,
        title: task.title,
        description: task.description,
        category: task.category,
        assignedRole: task.assignedRole,
        sourceControlledDocumentId: sourceId,
        status: "OPEN",
      },
    });
  }

  for (const service of APPROVED_SERVICE_MATRIX) {
    const sourceId = byKey.get(service.sourceControlledDocumentId) ?? null;
    await prisma.serviceAuthorization.upsert({
      where: { serviceCode: service.serviceCode },
      create: {
        serviceCode: service.serviceCode,
        serviceName: service.serviceName,
        status: service.status,
        activationRule: service.activationRule,
        sourceControlledDocumentId: sourceId,
        active: false,
        notes: service.notes,
      },
      update: {
        serviceName: service.serviceName,
        activationRule: service.activationRule,
        sourceControlledDocumentId: sourceId,
        notes: service.notes,
      },
    });
  }

  return { ok: true as const, registerCount: CONTROLLED_REGISTER_SEEDS.length };
}

export async function attachOfficialSourceToPackage(args: {
  actor: DocumentActor;
  companyDocumentId: string;
  sourcePackageKey?: string | null;
}) {
  if (!canManageCompanyLibrary(args.actor.roles)) return { error: "Not found." };
  const companyDocument = await prisma.companyDocument.findUnique({
    where: { id: args.companyDocumentId },
    include: { document: true },
  });
  if (!companyDocument) return { error: "Not found." };

  const sourcePackage = identifyOfficialSourcePackage({
    sourcePackageKey: args.sourcePackageKey,
    documentNumber: companyDocument.documentNumber,
    filename: companyDocument.document.originalFileName,
    sha256: companyDocument.document.contentSha256,
  });
  if (!sourcePackage) return { error: "Choose which official source package this file belongs to." };

  const hashMatch = officialSourceHashMatches(companyDocument.document.contentSha256, sourcePackage.expectedSha256);
  const targets = await prisma.controlledDocument.findMany({
    where: {
      controlledDocumentId: { in: [...sourcePackage.controlledDocumentIds] },
      status: { in: ["PENDING_SOURCE", "DRAFT"] },
    },
  });

  for (const row of targets) {
    const alreadyHasPreferredSource = Boolean(row.sourceManagedDocumentId) && sourcePackage.key !== "SC-ERP-001" && sourcePackage.key !== "SC-FRM-PACKAGE";
    if (alreadyHasPreferredSource) continue;
    await prisma.controlledDocument.update({
      where: { id: row.id },
      data: {
        parentCompanyDocumentId: companyDocument.id,
        sourceManagedDocumentId: companyDocument.documentId,
        status: "DRAFT",
        active: false,
        metadata: {
          awaitingMaster: false,
          packageKey: sourcePackage.key,
          officialSourceKey: sourcePackage.key,
          expectedSha256: sourcePackage.expectedSha256,
          uploadedSha256: companyDocument.document.contentSha256,
          hashMatch,
        },
      },
    });
  }

  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "controlled_document.official_source_attached",
    targetType: "company_document",
    targetId: companyDocument.id,
    metadata: {
      packageKey: sourcePackage.key,
      managedDocumentId: companyDocument.documentId,
      expectedSha256: sourcePackage.expectedSha256,
      uploadedSha256: companyDocument.document.contentSha256,
      hashMatch,
      updatedCount: targets.length,
      stillInactive: true,
      notActivated: true,
    },
  });

  return {
    ok: true as const,
    packageKey: sourcePackage.key as OfficialSourcePackageKey,
    managedDocumentId: companyDocument.documentId,
    hashMatch,
    updatedCount: targets.length,
  };
}

/** @deprecated Use attachOfficialSourceToPackage. Kept for the master-only attach path. */
export async function attachMasterSourceToPackage(args: {
  actor: DocumentActor;
  companyDocumentId: string;
}) {
  return attachOfficialSourceToPackage({ ...args, sourcePackageKey: "SC-MCM-001" });
}

export async function completeImplementationTask(args: {
  actor: DocumentActor;
  taskId: string;
  notes?: string;
  evidenceManagedDocumentId?: string;
}) {
  // Never auto-complete; Owner/Admin must call this explicitly.
  if (!canManageCompanyLibrary(args.actor.roles)) return { error: "Not found." };
  const task = await prisma.complianceImplementationTask.findUnique({ where: { id: args.taskId } });
  if (!task) return { error: "Not found." };
  if (task.status === "COMPLETED" || task.status === "WAIVED" || task.status === "CANCELED") {
    return { error: "This task is already closed." };
  }
  const updated = await prisma.complianceImplementationTask.update({
    where: { id: task.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedBy: args.actor.user.id,
      notes: args.notes?.trim() || task.notes,
      evidenceManagedDocumentId: args.evidenceManagedDocumentId || task.evidenceManagedDocumentId,
    },
  });
  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "implementation_task.completed",
    targetType: "implementation_task",
    targetId: task.id,
    metadata: { key: task.key },
  });
  return { ok: true as const, taskId: updated.id, status: updated.status };
}

export async function activateControlledDocument(args: { actor: DocumentActor; controlledDocumentId: string }) {
  if (!canManageCompanyLibrary(args.actor.roles)) return { error: "Not found." };
  const current = await prisma.controlledDocument.findUnique({ where: { id: args.controlledDocumentId } });
  if (!current) return { error: "Not found." };
  if (!current.sourceManagedDocumentId) {
    return { error: "Upload the master source file before activating a controlled record." };
  }
  await prisma.controlledDocument.update({
    where: { id: current.id },
    data: { status: "ACTIVE", active: true },
  });
  await writeAuditLog({
    actorId: args.actor.user.id,
    action: "controlled_document.activated",
    targetType: "controlled_document",
    targetId: current.id,
    metadata: { controlledDocumentId: current.controlledDocumentId },
  });
  return { ok: true as const };
}

export async function assignControlledDocument(args: {
  actor: DocumentActor;
  controlledDocumentId: string;
  action: CompanyAssignmentAction;
  audience: CompanyAssignmentAudience;
  roleKey?: string;
  employeeId?: string;
  jobOpeningId?: string;
  requirementId?: string;
}) {
  if (!canManageCompanyLibrary(args.actor.roles)) return { error: "Not found." };
  const controlled = await prisma.controlledDocument.findUnique({
    where: { id: args.controlledDocumentId },
  });
  if (!controlled) return { error: "Not found." };
  const created = await prisma.companyDocumentAssignment.create({
    data: {
      familyKey: controlled.controlledDocumentId,
      companyDocumentId: controlled.parentCompanyDocumentId,
      controlledDocumentId: controlled.id,
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
    action: "controlled_document.assigned",
    targetType: "controlled_document_assignment",
    targetId: created.id,
    metadata: {
      controlledDocumentId: controlled.controlledDocumentId,
      action: args.action,
      audience: args.audience,
    },
  });
  return { ok: true as const, assignmentId: created.id };
}

export function pendingSourceRegisterReady(row: { status: string; active: boolean; sourceManagedDocumentId: string | null }) {
  return row.status === "PENDING_SOURCE" && row.active === false && !row.sourceManagedDocumentId;
}

export function sharedMasterSource(rows: { sourceManagedDocumentId: string | null }[]) {
  const ids = [...new Set(rows.map((row) => row.sourceManagedDocumentId).filter(Boolean))];
  return ids.length <= 1;
}

export { controlledDocumentVisibleToAssignees };
