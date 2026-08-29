import type { Metadata } from "next";
import Link from "next/link";
import { DocumentUploader } from "@/components/portal/DocumentUploader";
import { DocumentStatusBadge } from "@/components/portal/DocumentStatusBadge";
import { EmptyState } from "@/components/portal/EmptyState";
import { documentUploadCapabilities } from "@/app/(portal)/dashboard/documents/actions";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  labelDocumentCategory,
  labelDocumentType,
} from "@/lib/documents/catalog";
import { DOCUMENT_TYPES } from "@/lib/documents/types";
import { associatedWithLabel, documentFileHref, expirationLabel } from "@/lib/documents/display";
import { documentBasePath, documentReviewHref } from "@/lib/documents/paths";
import { DOCUMENT_LIST_INCLUDE, DOCUMENT_PAGE_SIZE, documentLibraryWhere, type DocumentLibraryFilters } from "@/lib/documents/query";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

type Search = DocumentLibraryFilters & { page?: string };

export async function DocumentLibrary({
  searchParams,
  portal,
}: {
  searchParams: Promise<Search>;
  portal: "staff" | "operations";
}) {
  const ctx = await requirePermission("documents.view");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const where = documentLibraryWhere(ctx, params);
  const basePath = documentBasePath(portal);
  const [total, documents, capabilities] = await Promise.all([
    prisma.managedDocument.count({ where }),
    prisma.managedDocument.findMany({
      where,
      include: DOCUMENT_LIST_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * DOCUMENT_PAGE_SIZE,
      take: DOCUMENT_PAGE_SIZE,
    }),
    documentUploadCapabilities(),
  ]);
  const pages = Math.max(1, Math.ceil(total / DOCUMENT_PAGE_SIZE));
  const uploaderIds = [...new Set(documents.map((document) => document.uploadedBy).filter((id): id is string => Boolean(id)))];
  const uploaders = uploaderIds.length
    ? await prisma.user.findMany({ where: { id: { in: uploaderIds } }, select: { id: true, name: true } })
    : [];
  const uploaderNames = new Map(uploaders.map((user) => [user.id, user.name]));
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value)
      .map(([key, value]) => [key, String(value)]),
  );
  query.delete("page");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-navy">Documents</h1>
          <p className="mt-2 text-sm text-muted">
            Files you are authorized to access. Downloads use the secure document endpoint, not a public file URL.
          </p>
          <p className="mt-2 text-sm">
            <Link href={documentReviewHref(portal)} className="font-semibold text-medical hover:underline">
              Needs Review
            </Link>
            {portal === "staff" ? (
              <>
                {" · "}
                <Link href="/dashboard/documents/alerts" className="font-semibold text-medical hover:underline">
                  Alerts
                </Link>
              </>
            ) : null}
          </p>
        </div>
        {capabilities.canUpload ? <DocumentUploader associations={capabilities.associations} detailBasePath={basePath} /> : null}
      </div>
      {!capabilities.storageConfigured ? (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          File storage is not configured yet. Uploads stay disabled until a storage token is added.
        </p>
      ) : null}

      <form className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2 lg:grid-cols-4" method="get">
        <label className="text-sm font-semibold text-navy">
          Document name
          <input name="q" defaultValue={params.q} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-semibold text-navy">
          Category
          <select name="category" defaultValue={params.category ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            {DOCUMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {DOCUMENT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Type
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
          Verification
          <select name="verification" defaultValue={params.verification ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
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
          Expiration window
          <select name="expirationWindow" defaultValue={params.expirationWindow ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="30">Next 30 days</option>
            <option value="14">Next 14 days</option>
            <option value="7">Next 7 days</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Extraction
          <select name="extraction" defaultValue={params.extraction ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="OCR_DISABLED">OCR disabled</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIAL">Partial</option>
            <option value="FAILED">Failed</option>
            <option value="NOT_APPLICABLE">Not applicable</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Archived
          <select name="archived" defaultValue={params.archived ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Active only</option>
            <option value="1">Archived</option>
            <option value="all">All</option>
          </select>
        </label>
        <button className="self-end rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>

      {documents.length === 0 ? (
        <EmptyState title="No documents" body="No authorized documents match these filters." />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Document Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Document Type</th>
                <th className="px-4 py-3">Associated With</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Expiration</th>
                <th className="px-4 py-3">Uploaded By</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`${basePath}/${document.id}`} className="font-medium text-navy hover:text-medical">
                      {document.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{labelDocumentCategory(document.category)}</td>
                  <td className="px-4 py-3">{labelDocumentType(document.documentType)}</td>
                  <td className="px-4 py-3">{associatedWithLabel(document)}</td>
                  <td className="px-4 py-3">{expirationLabel(document)}</td>
                  <td className="px-4 py-3">
                    <DocumentStatusBadge document={document} />
                  </td>
                  <td className="px-4 py-3">{document.effectiveDate?.toLocaleDateString() ?? "—"}</td>
                  <td className="px-4 py-3">{document.expirationDate?.toLocaleDateString() ?? "—"}</td>
                  <td className="px-4 py-3">{document.uploadedBy ? uploaderNames.get(document.uploadedBy) ?? "—" : "—"}</td>
                  <td className="px-4 py-3">{document.createdAt.toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {hasPermission(ctx, "documents.download") ? (
                        <a href={documentFileHref(document.id)} className="font-semibold text-medical hover:underline">
                          View
                        </a>
                      ) : null}
                      <Link href={`${basePath}/${document.id}`} className="font-semibold text-medical hover:underline">
                        Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <p className="mt-4 flex flex-wrap gap-2 text-sm">
          {Array.from({ length: pages }, (_, index) => {
            const href = query.size ? `${basePath}?${query.toString()}&page=${index + 1}` : `${basePath}?page=${index + 1}`;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-1 font-semibold ${page === index + 1 ? "bg-navy text-white" : "border border-line text-navy"}`}
              >
                {index + 1}
              </Link>
            );
          })}
        </p>
      ) : null}
    </div>
  );
}

export const documentLibraryMetadata: Metadata = { title: "Documents" };
