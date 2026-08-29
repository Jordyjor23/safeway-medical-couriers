import { writeAuditLog } from "@/lib/audit";
import { canAccessManagedDocument, type DocumentActor } from "@/lib/documents/access";
import { isExtractionEnabled, resolveExtractionProvider } from "@/lib/documents/extraction/provider";
import { EXTRACTION_RETRY_MS, EXTRACTION_STALE_PROCESSING_MS } from "@/lib/documents/extraction/types";
import { MANUAL_EXTRACTION_MESSAGE, isExtractionUnsupportedFormat } from "@/lib/documents/extraction/unsupported";
import { loadManagedDocumentForAccess } from "@/lib/documents/operations";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { readPrivateFile } from "@/lib/storage";

function canTriggerExtraction(actor: DocumentActor) {
  return hasPermission(actor, "documents.verify") || hasPermission(actor, "documents.upload");
}

async function streamToBytes(stream: ReadableStream<Uint8Array> | null | undefined) {
  if (!stream) return null;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function startDocumentExtraction(args: {
  documentId: string;
  actor: DocumentActor;
  retry?: boolean;
}) {
  if (!isExtractionEnabled()) {
    return { status: "OCR_DISABLED" as const };
  }
  const access = await loadManagedDocumentForAccess(args.documentId);
  if (!access || !canAccessManagedDocument(args.actor, access, "view")) {
    return { error: "Not found." as const };
  }
  if (!canTriggerExtraction(args.actor)) {
    return { error: "Not found." as const };
  }

  const document = await prisma.managedDocument.findUnique({ where: { id: args.documentId } });
  if (!document) return { error: "Not found." as const };

  const now = Date.now();
  if (document.extractionStatus === "PROCESSING" && document.extractionStartedAt) {
    const age = now - document.extractionStartedAt.getTime();
    if (age < EXTRACTION_STALE_PROCESSING_MS) {
      return { error: "Extraction is already in progress." as const, status: "PROCESSING" as const };
    }
  }
  if (args.retry && document.extractionStartedAt) {
    const since = now - document.extractionStartedAt.getTime();
    if (since < EXTRACTION_RETRY_MS && document.extractionStatus !== "FAILED") {
      return { error: "Wait before retrying extraction." as const };
    }
  }

  const locked = await prisma.managedDocument.updateMany({
    where: {
      id: document.id,
      OR: [
        { extractionStatus: { not: "PROCESSING" } },
        { extractionStartedAt: { lt: new Date(now - EXTRACTION_STALE_PROCESSING_MS) } },
      ],
    },
    data: {
      extractionStatus: "PROCESSING",
      extractionStartedAt: new Date(),
      extractionError: null,
      lifecycleStatus: document.lifecycleStatus === "ARCHIVED" ? "ARCHIVED" : "PROCESSING",
    },
  });
  if (locked.count === 0 && document.extractionStatus === "PROCESSING") {
    return { error: "Extraction is already in progress." as const, status: "PROCESSING" as const };
  }

  await writeAuditLog({
    actorId: args.actor.user.id,
    action: args.retry ? "document.extraction.retried" : "document.extraction.started",
    targetType: "document",
    targetId: document.id,
  });

  try {
    if (isExtractionUnsupportedFormat(document.mimeType, document.originalFileName)) {
      await prisma.managedDocument.update({
        where: { id: document.id },
        data: {
          extractionStatus: "NOT_APPLICABLE",
          extractionProvider: resolveExtractionProvider().id,
          extractionError: MANUAL_EXTRACTION_MESSAGE,
          extractionCompletedAt: new Date(),
          lifecycleStatus: document.verificationStatus === "VERIFIED" ? "VERIFIED" : "UPLOADED",
        },
      });
      await writeAuditLog({
        actorId: args.actor.user.id,
        action: "document.extraction.completed",
        targetType: "document",
        targetId: document.id,
        metadata: { status: "NOT_APPLICABLE" },
      });
      return { status: "NOT_APPLICABLE" as const };
    }

    const stored = await readPrivateFile(document.blobKey);
    const bytes = await streamToBytes(stored.stream as ReadableStream<Uint8Array>);
    const result = await resolveExtractionProvider().extract({
      blobKey: document.blobKey,
      mimeType: document.mimeType,
      filename: document.originalFileName,
      bytes: bytes ?? undefined,
    });

    if (result.status === "OCR_DISABLED") {
      await prisma.managedDocument.update({
        where: { id: document.id },
        data: {
          extractionStatus: "OCR_DISABLED",
          extractionProvider: "noop",
          lifecycleStatus: document.verificationStatus === "VERIFIED" ? "VERIFIED" : "UPLOADED",
        },
      });
      return { status: "OCR_DISABLED" as const };
    }

    if (result.status === "NOT_APPLICABLE") {
      await prisma.managedDocument.update({
        where: { id: document.id },
        data: {
          extractionStatus: "NOT_APPLICABLE",
          extractionProvider: result.provider,
          extractionError: MANUAL_EXTRACTION_MESSAGE,
          extractionCompletedAt: new Date(),
          lifecycleStatus: document.verificationStatus === "VERIFIED" ? "VERIFIED" : "UPLOADED",
        },
      });
      await writeAuditLog({
        actorId: args.actor.user.id,
        action: "document.extraction.completed",
        targetType: "document",
        targetId: document.id,
        metadata: { provider: result.provider, status: "NOT_APPLICABLE" },
      });
      return { status: "NOT_APPLICABLE" as const };
    }

    await prisma.$transaction([
      prisma.documentExtractedField.deleteMany({ where: { documentId: document.id } }),
      ...result.fields.map((field) =>
        prisma.documentExtractedField.create({
          data: {
            documentId: document.id,
            fieldKey: field.key,
            displayLabel: field.label,
            rawValue: field.rawValue,
            proposedValue: field.proposedValue,
            confidence: field.confidence,
            sourcePage: field.sourcePage ?? null,
            sourceSnippet: field.sourceSnippet ?? null,
            ambiguousDate: field.ambiguousDate ?? false,
            mapsToDocumentField: field.mapsToDocumentField ?? null,
            reviewStatus: "PENDING",
          },
        }),
      ),
      prisma.managedDocument.update({
        where: { id: document.id },
        data: {
          extractionStatus: result.status === "FAILED" ? "FAILED" : result.status === "PARTIAL" ? "PARTIAL" : "COMPLETED",
          extractionProvider: result.provider,
          extractionError: result.error ?? null,
          extractionCompletedAt: new Date(),
          extractionRawText: result.extractedText || null,
          suggestedDocumentType: result.detectedDocumentType,
          suggestedTypeConfidence: result.detectedDocumentType ? result.typeConfidence : null,
          suggestedTypeStatus: result.detectedDocumentType ? "PENDING" : null,
          lifecycleStatus:
            result.status === "FAILED"
              ? document.verificationStatus === "VERIFIED"
                ? "VERIFIED"
                : "UPLOADED"
              : "NEEDS_REVIEW",
        },
      }),
    ]);

    await writeAuditLog({
      actorId: args.actor.user.id,
      action: result.status === "FAILED" ? "document.extraction.failed" : "document.extraction.completed",
      targetType: "document",
      targetId: document.id,
      metadata: {
        provider: result.provider,
        fieldCount: result.fields.length,
        suggestedType: result.detectedDocumentType,
      },
    });
    if (result.detectedDocumentType) {
      await writeAuditLog({
        actorId: args.actor.user.id,
        action: "document.type.suggested",
        targetType: "document",
        targetId: document.id,
        metadata: { suggestedType: result.detectedDocumentType, confidence: result.typeConfidence },
      });
    }
    return { status: result.status, documentId: document.id };
  } catch {
    await prisma.managedDocument.update({
      where: { id: document.id },
      data: {
        extractionStatus: "FAILED",
        extractionError: "Extraction failed. The original file was not changed.",
        extractionCompletedAt: new Date(),
        lifecycleStatus: document.verificationStatus === "VERIFIED" ? "VERIFIED" : "UPLOADED",
      },
    });
    await writeAuditLog({
      actorId: args.actor.user.id,
      action: "document.extraction.failed",
      targetType: "document",
      targetId: document.id,
    });
    return { status: "FAILED" as const };
  }
}
