import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveDocumentButton, RestoreDocumentButton } from "@/components/portal/ArchiveDocumentButton";
import { DocumentMetadataForm } from "@/components/portal/DocumentMetadataForm";
import { DocumentPreview } from "@/components/portal/DocumentPreview";
import { DocumentStatusBadge } from "@/components/portal/DocumentStatusBadge";
import { DocumentUploader } from "@/components/portal/DocumentUploader";
import { ExtractionReviewPanel } from "@/components/portal/ExtractionReviewPanel";
import { VerifyDocumentPanel } from "@/components/portal/VerifyDocumentPanel";
import { documentUploadCapabilities } from "@/app/(portal)/dashboard/documents/actions";
import { writeAuditLog } from "@/lib/audit";
import { canAccessManagedDocument } from "@/lib/documents/access";
import { loadManagedDocumentForAccess } from "@/lib/documents/operations";
import { labelDocumentCategory, labelDocumentType } from "@/lib/documents/catalog";
import { associatedWithLabel, documentFileHref, expirationLabel, formatPersonName } from "@/lib/documents/display";
import { documentBasePath } from "@/lib/documents/paths";
import { DOCUMENT_LIST_INCLUDE } from "@/lib/documents/query";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export async function ManagedDocumentDetail({
  params,
  portal,
}: {
  params: Promise<{ documentId: string }>;
  portal: "staff" | "operations";
}) {
  const ctx = await requirePermission("documents.view");
  const { documentId } = await params;
  const basePath = documentBasePath(portal);
  const [document, access] = await Promise.all([
    prisma.managedDocument.findUnique({
      where: { id: documentId },
      include: {
        ...DOCUMENT_LIST_INCLUDE,
        supersedes: { select: { id: true, name: true } },
        supersededBy: { select: { id: true, name: true } },
        extractedFields: { orderBy: { createdAt: "asc" } },
      },
    }),
    loadManagedDocumentForAccess(documentId),
  ]);
  if (!document || !access || !canAccessManagedDocument(ctx, access, "view")) notFound();

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "document.viewed",
    targetType: "document",
    targetId: document.id,
  });

  const [uploader, capabilities, audit] = await Promise.all([
    document.uploadedBy
      ? prisma.user.findUnique({ where: { id: document.uploadedBy }, select: { name: true, email: true } })
      : null,
    documentUploadCapabilities(),
    hasPermission(ctx, "audit.view")
      ? prisma.auditLog.findMany({
          where: { targetType: "document", targetId: document.id },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
  ]);
  const canDownload = canAccessManagedDocument(ctx, access, "download");
  const canArchive = canAccessManagedDocument(ctx, access, "archive");
  const canEdit = canAccessManagedDocument(ctx, access, "edit");
  const canVerify = canAccessManagedDocument(ctx, access, "verify") && capabilities.canVerify;
  const archived = Boolean(document.archivedAt || document.lifecycleStatus === "ARCHIVED");

  return (
    <div className="space-y-6">
      <div>
        <Link href={basePath} className="text-sm font-semibold text-medical hover:underline">
          ← Documents
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-navy">{document.name}</h1>
        <p className="text-muted">
          {labelDocumentCategory(document.category)} · {labelDocumentType(document.documentType)}
        </p>
        <div className="mt-2">
          <DocumentStatusBadge document={document} />
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Details</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Associated with</dt>
            <dd>{associatedWithLabel(document)}</dd>
          </div>
          <div>
            <dt className="text-muted">Expiration</dt>
            <dd>
              {expirationLabel(document)}
              {document.expirationDate ? ` · ${document.expirationDate.toLocaleDateString()}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Effective</dt>
            <dd>{document.effectiveDate?.toLocaleDateString() ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Uploaded</dt>
            <dd>
              {document.createdAt.toLocaleString()}
              {uploader ? ` · ${uploader.name}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Original file</dt>
            <dd>{document.originalFileName ?? document.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Extraction</dt>
            <dd>{document.extractionStatus.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-muted">Verification</dt>
            <dd>
              {document.verificationStatus.replaceAll("_", " ")}
              {document.rejectionReason ? ` · ${document.rejectionReason}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Version</dt>
            <dd>
              {document.supersedes ? (
                <>
                  Replaces{" "}
                  <Link href={`${basePath}/${document.supersedes.id}`} className="font-semibold text-medical hover:underline">
                    {document.supersedes.name}
                  </Link>
                </>
              ) : (
                "Current"
              )}
            </dd>
          </div>
        </dl>
        {document.supersededBy.length ? (
          <p className="mt-3 text-sm">
            Replaced by{" "}
            {document.supersededBy.map((item) => (
              <Link key={item.id} href={`${basePath}/${item.id}`} className="font-semibold text-medical hover:underline">
                {item.name}
              </Link>
            ))}
          </p>
        ) : null}
        {document.notes ? <p className="mt-3 text-sm">{document.notes}</p> : null}
        <DocumentPreview documentId={document.id} mimeType={document.mimeType} canDownload={canDownload} />
        <div className="mt-4 flex flex-wrap gap-2">
          {canDownload ? (
            <a href={documentFileHref(document.id)} className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
              View / Download
            </a>
          ) : null}
          {capabilities.canUpload && !archived ? (
            <DocumentUploader
              associations={capabilities.associations}
              detailBasePath={basePath}
              preset={{
                employeeId: document.employeeLinks[0]?.employee.id,
                employeeLabel: document.employeeLinks[0]
                  ? formatPersonName(document.employeeLinks[0].employee.legalFirstName, document.employeeLinks[0].employee.legalLastName)
                  : undefined,
                customerId: document.customerLinks[0]?.customer.id,
                customerLabel: document.customerLinks[0]?.customer.legalName,
                contractId: document.contractLinks[0]?.contract.id,
                contractLabel: document.contractLinks[0]
                  ? `${document.contractLinks[0].contract.contractNumber} · ${document.contractLinks[0].contract.customer.legalName}`
                  : undefined,
                deliveryId: document.deliveryLinks[0]?.delivery.id,
                deliveryLabel: document.deliveryLinks[0]
                  ? `${document.deliveryLinks[0].delivery.deliveryNumber} · ${document.deliveryLinks[0].delivery.customer.legalName}`
                  : undefined,
                supersedesId: document.id,
                category: document.category,
              }}
              triggerLabel="Upload Replacement"
            />
          ) : null}
          {canArchive && !archived ? <ArchiveDocumentButton documentId={document.id} /> : null}
          {canArchive && archived ? <RestoreDocumentButton documentId={document.id} /> : null}
        </div>
      </section>

      <ExtractionReviewPanel
        documentId={document.id}
        extractionStatus={document.extractionStatus}
        extractionError={document.extractionError}
        suggestedDocumentType={document.suggestedDocumentType}
        suggestedTypeConfidence={document.suggestedTypeConfidence}
        suggestedTypeStatus={document.suggestedTypeStatus}
        fields={document.extractedFields}
        canEdit={canEdit}
        canExtract={capabilities.canExtract && document.extractionStatus !== "PROCESSING"}
        mimeType={document.mimeType}
        filename={document.originalFileName}
      />

      {canEdit ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-semibold text-navy">Metadata</h2>
          <p className="mt-1 text-sm text-muted">Manual entry remains available if extraction is disabled or failed.</p>
          <div className="mt-4">
            <DocumentMetadataForm document={document} />
          </div>
        </section>
      ) : null}

      {canVerify && !archived ? <VerifyDocumentPanel documentId={document.id} /> : null}

      {hasPermission(ctx, "audit.view") ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-semibold text-navy">History</h2>
          {audit.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No audit events for this document.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {audit.map((event) => (
                <li key={event.id}>
                  {event.createdAt.toLocaleString()} · {event.action}
                  {event.actorEmail ? ` · ${event.actorEmail}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
