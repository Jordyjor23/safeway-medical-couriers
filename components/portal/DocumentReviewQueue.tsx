import Link from "next/link";
import { EmptyState } from "@/components/portal/EmptyState";
import { documentUploadCapabilities } from "@/app/(portal)/dashboard/documents/actions";
import { labelDocumentType } from "@/lib/documents/catalog";
import { associatedWithLabel } from "@/lib/documents/display";
import { documentBasePath } from "@/lib/documents/paths";
import { DOCUMENT_LIST_INCLUDE, documentLibraryWhere, type DocumentLibraryFilters } from "@/lib/documents/query";
import { DOCUMENT_TYPES } from "@/lib/documents/types";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

type Search = DocumentLibraryFilters & { page?: string };

export async function DocumentReviewQueue({
  searchParams,
  portal,
}: {
  searchParams: Promise<Search>;
  portal: "staff" | "operations";
}) {
  const ctx = await requirePermission("documents.view");
  const params = await searchParams;
  const basePath = documentBasePath(portal);
  const where = documentLibraryWhere(ctx, { ...params, needsReview: "1", archived: params.archived ?? "all" });
  const [documents, capabilities] = await Promise.all([
    prisma.managedDocument.findMany({
      where,
      include: {
        ...DOCUMENT_LIST_INCLUDE,
        extractedFields: { select: { id: true, confidence: true, reviewStatus: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    documentUploadCapabilities(),
  ]);
  const uploaderIds = [...new Set(documents.map((document) => document.uploadedBy).filter((id): id is string => Boolean(id)))];
  const uploaders = uploaderIds.length
    ? await prisma.user.findMany({ where: { id: { in: uploaderIds } }, select: { id: true, name: true } })
    : [];
  const names = new Map(uploaders.map((user) => [user.id, user.name]));

  return (
    <div>
      <Link href={basePath} className="text-sm font-semibold text-medical hover:underline">
        ← Documents
      </Link>
      <h1 className="mt-3 text-3xl font-semibold text-navy">Needs Review</h1>
      <p className="mt-2 text-sm text-muted">
        Extraction suggestions never mark a file compliant. Accept or edit fields, then verify.
      </p>
      {!capabilities.extractionEnabled ? (
        <p className="mt-4 rounded-xl border border-line bg-ice px-4 py-3 text-sm text-muted">
          OCR is disabled. Documents can still be reviewed and verified from uploaded metadata.
        </p>
      ) : null}

      <form className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2 lg:grid-cols-4" method="get">
        <label className="text-sm font-semibold text-navy">
          Employee
          <input name="employee" defaultValue={params.employee} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-semibold text-navy">
          Customer
          <input name="customer" defaultValue={params.customer} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-semibold text-navy">
          Contract
          <input name="contract" defaultValue={params.contract} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-semibold text-navy">
          Delivery
          <input name="delivery" defaultValue={params.delivery} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-semibold text-navy">
          Document type
          <select name="documentType" defaultValue={params.documentType ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {labelDocumentType(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Extraction
          <select name="extraction" defaultValue={params.extraction ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIAL">Partial</option>
            <option value="FAILED">Failed</option>
            <option value="PROCESSING">Processing</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Verification
          <select name="verification" defaultValue={params.verification ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Uploaded from
          <input name="uploadedFrom" type="date" defaultValue={params.uploadedFrom} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-semibold text-navy">
          Uploaded to
          <input name="uploadedTo" type="date" defaultValue={params.uploadedTo} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <button className="self-end rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>

      {documents.length === 0 ? (
        <EmptyState title="Nothing needs review" body="Authorized documents with pending extraction or verification will appear here." />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Association</th>
                <th className="px-4 py-3">Uploaded By</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Extraction</th>
                <th className="px-4 py-3">Suggested fields</th>
                <th className="px-4 py-3">Low confidence</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const pending = document.extractedFields.filter((field) => field.reviewStatus === "PENDING");
                const low = pending.filter((field) => field.confidence < 0.5).length;
                return (
                  <tr key={document.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-navy">{document.name}</td>
                    <td className="px-4 py-3">{labelDocumentType(document.documentType)}</td>
                    <td className="px-4 py-3">{associatedWithLabel(document)}</td>
                    <td className="px-4 py-3">{document.uploadedBy ? names.get(document.uploadedBy) ?? "—" : "—"}</td>
                    <td className="px-4 py-3">{document.createdAt.toLocaleDateString()}</td>
                    <td className="px-4 py-3">{document.extractionStatus.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">{pending.length}</td>
                    <td className="px-4 py-3">{low}</td>
                    <td className="px-4 py-3">{document.verificationStatus.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">
                      <Link href={`${basePath}/${document.id}`} className="font-semibold text-medical hover:underline">
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
