import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { resolveCandidateOnboardingToken } from "@/lib/candidate-onboarding";
import { prisma } from "@/lib/db";
import {
  applicantOnboardingDocumentTypes,
  SENSITIVE_ONBOARDING_DOCUMENT_TYPES,
} from "@/lib/onboarding-documents";
import { storePrivateFile } from "@/lib/storage";
import { validateDocumentFile } from "@/lib/documents/validate";

function optionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw + "T00:00:00.000Z");
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const resolved = await resolveCandidateOnboardingToken(token);
  if (!resolved) {
    return NextResponse.json({ error: "This onboarding link is invalid or expired." }, { status: 404 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentUploads = await prisma.applicantDocument.count({
    where: {
      applicationId: resolved.application.id,
      createdAt: { gte: oneHourAgo },
    },
  });
  if (recentUploads >= 20) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const documentType = String(formData.get("documentType") ?? "").trim();
  const allowedTypes = applicantOnboardingDocumentTypes({
    workerClassification: resolved.application.jobOpening.workerClassification,
    requiresDriving: resolved.application.jobOpening.requiresDriversLicense,
  });
  if (!allowedTypes.includes(documentType)) {
    return NextResponse.json({ error: "That document type is not allowed for this onboarding link." }, { status: 400 });
  }

  const validation = await validateDocumentFile(file);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const duplicate = await prisma.applicantDocument.findFirst({
    where: {
      applicationId: resolved.application.id,
      document: {
        contentSha256: validation.contentSha256,
        lifecycleStatus: { not: "ARCHIVED" },
      },
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "This file has already been submitted." }, { status: 409 });
  }

  const stored = await storePrivateFile(file);
  const name = String(formData.get("name") ?? "").trim() || stored.originalFileName;
  const effectiveDate = optionalDate(formData.get("effectiveDate"));
  const expirationDate = optionalDate(formData.get("expirationDate"));

  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.managedDocument.create({
      data: {
        name,
        category: "APPLICANT_DOCUMENTS",
        documentType,
        blobKey: stored.blobKey,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        originalFileName: stored.originalFileName,
        storedFileName: stored.storedFileName,
        contentSha256: stored.contentSha256,
        effectiveDate,
        expirationDate,
        isSensitive: SENSITIVE_ONBOARDING_DOCUMENT_TYPES.has(documentType),
        lifecycleStatus: "NEEDS_REVIEW",
        verificationStatus: "UNVERIFIED",
        extractionStatus: "OCR_DISABLED",
        notes: "Submitted by candidate through secure onboarding link.",
      },
    });
    await tx.applicantDocument.create({
      data: {
        applicationId: resolved.application.id,
        documentId: created.id,
      },
    });
    return created;
  });

  await writeAuditLog({
    action: "applicant.document.uploaded",
    targetType: "application",
    targetId: resolved.application.id,
    metadata: {
      documentId: document.id,
      documentType,
      trackingNumber: resolved.application.trackingNumber,
    },
  });

  return NextResponse.json({ ok: true, documentId: document.id }, { status: 201 });
}
