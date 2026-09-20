import type { DocumentCategory } from "@prisma/client";
import type { DocumentActor } from "@/lib/documents/access";
import {
  DUPLICATE_FILE_WARNING,
  TYPES_BY_CATEGORY,
  isDocumentType,
} from "@/lib/documents/catalog";
import { SENSITIVE_ONBOARDING_DOCUMENT_TYPES } from "@/lib/onboarding-documents";
import { findVisibleDuplicates } from "@/lib/documents/operations";
import { blocksExternalDocumentExtraction } from "@/lib/documents/extraction/egress";
import { startDocumentExtraction } from "@/lib/documents/extraction/run";
import { persistManagedDocument } from "@/lib/documents/persist";
import { documentMaxBytes } from "@/lib/documents/types";
import { validateDocumentFile } from "@/lib/documents/validate";
import { DocumentStorageError, isPrivateStorageConfigured, storePrivateFile } from "@/lib/storage";

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

export async function processDocumentUpload(ctx: DocumentActor, formData: FormData) {
  if (!isPrivateStorageConfigured()) {
    return { error: "Document storage is not configured." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  const allowDuplicate = String(formData.get("allowDuplicate") ?? "") === "1";
  try {
    if (file.size > documentMaxBytes()) {
      return { error: `The file exceeds the ${Math.floor(documentMaxBytes() / (1024 * 1024))} MB limit.` };
    }
    const validation = await validateDocumentFile(file);
    if (!validation.ok) return { error: validation.error };
    if (!allowDuplicate) {
      const matches = await findVisibleDuplicates({ actor: ctx, contentSha256: validation.contentSha256 });
      if (matches.length) {
        return {
          duplicate: true as const,
          message: DUPLICATE_FILE_WARNING,
          matches: matches.map((match) => ({
            id: match.id,
            name: match.name,
            uploadedAt: match.createdAt.toISOString(),
          })),
        };
      }
    }
    const documentTypeRaw = String(formData.get("documentType") ?? "").trim();
    const documentType = documentTypeRaw && isDocumentType(documentTypeRaw) ? documentTypeRaw : null;
    const category = String(formData.get("category") ?? "CORPORATE") as DocumentCategory;
    const isSensitive =
      String(formData.get("isSensitive") ?? "") === "1" ||
      SENSITIVE_ONBOARDING_DOCUMENT_TYPES.has(documentTypeRaw);
    const employeeId = optionalId(formData.get("employeeId"));
    const customerId = optionalId(formData.get("customerId"));
    const contractId = optionalId(formData.get("contractId"));
    const deliveryId = optionalId(formData.get("deliveryId"));
    const selfServiceEmployee = ctx.roles.includes("EMPLOYEE") || ctx.roles.includes("DRIVER");

    if (selfServiceEmployee) {
      const allowedCategories: DocumentCategory[] = [
        "EMPLOYEE_DOCUMENTS",
        "DRIVER_DOCUMENTS",
        "TRAINING",
        "VEHICLE",
      ];
      if (!allowedCategories.includes(category)) {
        return { error: "That document category is not available for employee self-service." };
      }
      if (!ctx.user.employeeId || employeeId !== ctx.user.employeeId || customerId || contractId || deliveryId) {
        return { error: "Employee uploads can only be attached to your own profile." };
      }
      const categoryTypes = TYPES_BY_CATEGORY[category] ?? [];
      if (!documentTypeRaw || !(categoryTypes as readonly string[]).includes(documentTypeRaw)) {
        return { error: "Choose a valid document type for this category." };
      }
    }

    const stored = await storePrivateFile(file);
    const result = await persistManagedDocument({
      actor: ctx,
      stored,
      name: String(formData.get("name") ?? stored.originalFileName),
      category,
      documentType,
      effectiveDate: optionalDate(formData.get("effectiveDate")),
      expirationDate: optionalDate(formData.get("expirationDate")),
      notes: String(formData.get("notes") ?? "") || null,
      isSensitive,
      employeeId,
      customerId,
      contractId,
      deliveryId,
      supersedesId: optionalId(formData.get("supersedesId")),
    });
    if ("error" in result && result.error) return { error: result.error };
    if (
      result.document?.id &&
      !blocksExternalDocumentExtraction({ isSensitive, documentType, category })
    ) {
      try {
        await startDocumentExtraction({ documentId: result.document.id, actor: ctx });
      } catch {
        // File persistence already succeeded. Extraction failure must not affect the original file.
      }
    }
    return { ok: true as const, documentId: result.document?.id };
  } catch (error) {
    if (error instanceof DocumentStorageError) return { error: error.message };
    return { error: "The document could not be uploaded. Try again." };
  }
}
