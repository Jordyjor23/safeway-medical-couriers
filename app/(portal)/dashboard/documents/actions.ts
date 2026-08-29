"use server";

import { revalidatePath } from "next/cache";
import type { DocumentCategory } from "@prisma/client";
import {
  associationPickerKinds,
  canAssociateContract,
  canAssociateCustomer,
  canAssociateDelivery,
  canAssociateEmployee,
} from "@/lib/documents/access";
import { isDocumentType } from "@/lib/documents/catalog";
import { isExtractionEnabled } from "@/lib/documents/extraction/provider";
import { startDocumentExtraction } from "@/lib/documents/extraction/run";
import { acceptHighConfidenceFields, acceptSuggestedDocumentType, reviewExtractedField } from "@/lib/documents/extraction/review";
import { isDocumentAccessError, notFoundResult } from "@/lib/documents/errors";
import {
  archiveManagedDocument,
  rejectManagedDocument,
  restoreManagedDocument,
  updateManagedDocumentMetadata,
  verifyManagedDocument,
} from "@/lib/documents/operations";
import { processDocumentUpload } from "@/lib/documents/upload";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";
import { isPrivateStorageConfigured } from "@/lib/storage";

function optionalId(value: FormDataEntryValue | null) {
  const id = String(value ?? "").trim();
  return id || undefined;
}

function optionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCategory(value: FormDataEntryValue | null): DocumentCategory {
  const category = String(value ?? "CORPORATE");
  return category as DocumentCategory;
}

export async function uploadBusinessDocument(formData: FormData) {
  const ctx = await requirePermission("documents.upload");
  const result = await processDocumentUpload(ctx, formData);
  if ("ok" in result && result.ok) {
    revalidatePath("/dashboard/documents");
    revalidatePath("/operations/documents");
    revalidatePath("/dashboard/documents/review");
    revalidatePath("/operations/documents/review");
    const employeeId = optionalId(formData.get("employeeId"));
    const customerId = optionalId(formData.get("customerId"));
    const contractId = optionalId(formData.get("contractId"));
    const deliveryId = optionalId(formData.get("deliveryId"));
    if (employeeId) revalidatePath(`/dashboard/employees/${employeeId}`);
    if (customerId) revalidatePath(`/dashboard/customers/${customerId}`);
    if (contractId) revalidatePath(`/dashboard/contracts/${contractId}`);
    if (deliveryId) {
      revalidatePath(`/dashboard/deliveries/${deliveryId}`);
      revalidatePath(`/dispatch/deliveries/${deliveryId}`);
    }
  }
  return result;
}

export async function archiveDocumentAction(formData: FormData) {
  const ctx = await requirePermission("documents.view");
  const confirmed = String(formData.get("confirm") ?? "") === "1";
  if (!confirmed) return { error: "Archive was not confirmed." };
  const documentId = String(formData.get("documentId") ?? "");
  try {
    const result = await archiveManagedDocument({
      documentId,
      actor: ctx,
      reason: String(formData.get("archiveReason") ?? "") || "Archived from portal",
    });
    if ("error" in result && result.error) return notFoundResult();
  } catch (error) {
    if (isDocumentAccessError(error)) return notFoundResult();
    throw error;
  }
  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/documents/${documentId}`);
  return { ok: true as const };
}

export async function restoreDocumentAction(formData: FormData) {
  const ctx = await requirePermission("documents.view");
  const documentId = String(formData.get("documentId") ?? "");
  try {
    const result = await restoreManagedDocument({ documentId, actor: ctx });
    if ("error" in result && result.error) return notFoundResult();
  } catch (error) {
    if (isDocumentAccessError(error)) return notFoundResult();
    throw error;
  }
  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/documents/${documentId}`);
  return { ok: true as const };
}

export async function updateDocumentMetadataAction(formData: FormData) {
  const ctx = await requirePermission("documents.editMetadata");
  const documentId = String(formData.get("documentId") ?? "");
  const documentTypeRaw = String(formData.get("documentType") ?? "").trim();
  const result = await updateManagedDocumentMetadata({
    documentId,
    actor: ctx,
    name: String(formData.get("name") ?? ""),
    category: parseCategory(formData.get("category")),
    documentType: documentTypeRaw && isDocumentType(documentTypeRaw) ? documentTypeRaw : null,
    effectiveDate: optionalDate(formData.get("effectiveDate")),
    expirationDate: optionalDate(formData.get("expirationDate")),
    notes: String(formData.get("notes") ?? "") || null,
    isSensitive: String(formData.get("isSensitive") ?? "") === "1",
  });
  if ("error" in result && result.error) return { error: "Not found." };
  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/documents/${documentId}`);
  return { ok: true as const };
}

export async function searchDocumentAssociations(kind: "employee" | "customer" | "contract" | "delivery", query: string) {
  const ctx = await requirePermission("documents.view");
  const q = query.trim();
  const pickers = associationPickerKinds(ctx);
  if (!pickers[kind]) return [];

  if (kind === "employee") {
    if (ctx.roles.includes("DRIVER") || ctx.roles.includes("EMPLOYEE")) {
      if (!ctx.user.employeeId || !canAssociateEmployee(ctx, ctx.user.employeeId)) return [];
      const employee = await prisma.employee.findUnique({
        where: { id: ctx.user.employeeId },
        select: { id: true, legalFirstName: true, legalLastName: true, employeeNumber: true },
      });
      return employee ? [{ id: employee.id, label: `${employee.legalFirstName} ${employee.legalLastName} · ${employee.employeeNumber}` }] : [];
    }
    const employees = await prisma.employee.findMany({
      where: q
        ? {
            OR: [
              { legalFirstName: { contains: q, mode: "insensitive" as const } },
              { legalLastName: { contains: q, mode: "insensitive" as const } },
              { employeeNumber: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
      take: 20,
      orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
      select: { id: true, legalFirstName: true, legalLastName: true, employeeNumber: true },
    });
    return employees
      .filter((employee) => canAssociateEmployee(ctx, employee.id))
      .map((employee) => ({
        id: employee.id,
        label: `${employee.legalFirstName} ${employee.legalLastName} · ${employee.employeeNumber}`,
      }));
  }

  if (kind === "customer") {
    const where =
      ctx.roles.includes("CUSTOMER") && ctx.user.customerId
        ? { id: ctx.user.customerId }
        : q
          ? { legalName: { contains: q, mode: "insensitive" as const } }
          : {};
    const customers = await prisma.customer.findMany({
      where,
      take: 20,
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true },
    });
    return customers
      .filter((customer) => canAssociateCustomer(ctx, customer.id))
      .map((customer) => ({ id: customer.id, label: customer.legalName }));
  }

  if (kind === "contract") {
    const contracts = await prisma.contract.findMany({
      where: {
        ...(ctx.roles.includes("CUSTOMER") && ctx.user.customerId ? { customerId: ctx.user.customerId } : {}),
        ...(q ? { OR: [{ contractNumber: { contains: q, mode: "insensitive" as const } }, { customer: { legalName: { contains: q, mode: "insensitive" as const } } }] } : {}),
      },
      take: 20,
      orderBy: { contractNumber: "asc" },
      select: { id: true, contractNumber: true, customerId: true, customer: { select: { legalName: true } } },
    });
    return contracts
      .filter((contract) => canAssociateContract(ctx, contract.customerId))
      .map((contract) => ({ id: contract.id, label: `${contract.contractNumber} · ${contract.customer.legalName}` }));
  }

  const deliveries = await prisma.delivery.findMany({
    where: {
      ...(ctx.roles.includes("CUSTOMER") && ctx.user.customerId ? { customerId: ctx.user.customerId } : {}),
      ...(ctx.roles.includes("DRIVER") && ctx.user.employeeId ? { driverEmployeeId: ctx.user.employeeId } : {}),
      ...(q
        ? {
            OR: [
              { deliveryNumber: { contains: q, mode: "insensitive" as const } },
              { customer: { legalName: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    take: 20,
    orderBy: { createdAt: "desc" },
    select: { id: true, deliveryNumber: true, customerId: true, driverEmployeeId: true, customer: { select: { legalName: true } } },
  });
  return deliveries
    .filter((delivery) => canAssociateDelivery(ctx, delivery))
    .map((delivery) => ({ id: delivery.id, label: `${delivery.deliveryNumber} · ${delivery.customer.legalName}` }));
}

function revalidateDocumentRoutes(documentId: string) {
  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/documents/${documentId}`);
  revalidatePath("/operations/documents");
  revalidatePath(`/operations/documents/${documentId}`);
  revalidatePath("/dashboard/documents/review");
  revalidatePath("/operations/documents/review");
}

export async function retryDocumentExtractionAction(formData: FormData) {
  const ctx = await requirePermission("documents.view");
  const documentId = String(formData.get("documentId") ?? "");
  const result = await startDocumentExtraction({ documentId, actor: ctx, retry: true });
  if ("error" in result && result.error) return { error: result.error };
  revalidateDocumentRoutes(documentId);
  return { ok: true as const };
}

export async function reviewFieldAction(formData: FormData) {
  const ctx = await requirePermission("documents.editMetadata");
  const actionRaw = String(formData.get("action") ?? "");
  const action = actionRaw === "EDIT" || actionRaw === "IGNORE" || actionRaw === "ACCEPT" ? actionRaw : "ACCEPT";
  const result = await reviewExtractedField({
    actor: ctx,
    fieldId: String(formData.get("fieldId") ?? ""),
    action,
    value: String(formData.get("value") ?? ""),
  });
  if ("error" in result && result.error) return { error: result.error };
  revalidateDocumentRoutes(String(formData.get("documentId") ?? ""));
  return { ok: true as const };
}

export async function reviewSuggestedTypeAction(formData: FormData) {
  const ctx = await requirePermission("documents.editMetadata");
  const documentId = String(formData.get("documentId") ?? "");
  const result = await acceptSuggestedDocumentType({
    actor: ctx,
    documentId,
    accept: String(formData.get("accept") ?? "") === "1",
    documentType: String(formData.get("documentType") ?? ""),
  });
  if ("error" in result && result.error) return { error: result.error };
  revalidateDocumentRoutes(documentId);
  return { ok: true as const };
}

export async function acceptHighConfidenceAction(formData: FormData) {
  const ctx = await requirePermission("documents.editMetadata");
  const documentId = String(formData.get("documentId") ?? "");
  const result = await acceptHighConfidenceFields({
    actor: ctx,
    documentId,
    confirmed: String(formData.get("confirmed") ?? "") === "1",
  });
  if ("error" in result && result.error) return { error: result.error };
  revalidateDocumentRoutes(documentId);
  return { ok: true as const };
}

export async function verifyDocumentAction(formData: FormData) {
  const ctx = await requirePermission("documents.verify");
  const documentId = String(formData.get("documentId") ?? "");
  try {
    const result = await verifyManagedDocument({ documentId, actor: ctx });
    if ("error" in result && result.error) return notFoundResult();
  } catch (error) {
    if (isDocumentAccessError(error)) return notFoundResult();
    throw error;
  }
  revalidateDocumentRoutes(documentId);
  return { ok: true as const };
}

export async function rejectDocumentAction(formData: FormData) {
  const ctx = await requirePermission("documents.verify");
  const documentId = String(formData.get("documentId") ?? "");
  const reason = String(formData.get("rejectionReason") ?? "").trim();
  if (reason.length < 3) return { error: "Add a rejection reason." };
  try {
    const result = await rejectManagedDocument({ documentId, actor: ctx, reason });
    if ("error" in result && result.error) return notFoundResult();
  } catch (error) {
    if (isDocumentAccessError(error)) return notFoundResult();
    throw error;
  }
  revalidateDocumentRoutes(documentId);
  return { ok: true as const };
}

export async function documentUploadCapabilities() {
  const ctx = await requirePermission("documents.view");
  return {
    canUpload: hasPermission(ctx, "documents.upload") && isPrivateStorageConfigured(),
    canArchive: hasPermission(ctx, "documents.archive") || hasPermission(ctx, "documents.delete"),
    canEdit: hasPermission(ctx, "documents.editMetadata"),
    canVerify: hasPermission(ctx, "documents.verify"),
    canExtract: (hasPermission(ctx, "documents.verify") || hasPermission(ctx, "documents.upload")) && isExtractionEnabled(),
    extractionEnabled: isExtractionEnabled(),
    storageConfigured: isPrivateStorageConfigured(),
    associations: associationPickerKinds(ctx),
  };
}
