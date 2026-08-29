import Link from "next/link";
import { DocumentStatusBadge } from "@/components/portal/DocumentStatusBadge";
import { EmptyState } from "@/components/portal/EmptyState";
import { labelDocumentCategory, labelDocumentType } from "@/lib/documents/catalog";
import { associatedWithLabel, documentFileHref } from "@/lib/documents/display";
import type { DocumentGroup } from "@/lib/documents/groups";
import { groupDocumentsByType } from "@/lib/documents/groups";

type ListedDocument = {
  id: string;
  name: string;
  category: string;
  documentType: string | null;
  lifecycleStatus: Parameters<typeof DocumentStatusBadge>[0]["document"]["lifecycleStatus"];
  verificationStatus: Parameters<typeof DocumentStatusBadge>[0]["document"]["verificationStatus"];
  expirationDate: Date | null;
  archivedAt: Date | null;
  isSensitive: boolean;
  createdAt: Date;
  rejectionReason?: string | null;
  employeeLinks: { employee: { legalFirstName: string; legalLastName: string } }[];
  customerLinks: { customer: { legalName: string } }[];
  contractLinks: { contract: { contractNumber: string; customer: { legalName: string } } }[];
  deliveryLinks: { delivery: { deliveryNumber: string; customer: { legalName: string } } }[];
};

export function EntityDocumentsSection({
  title,
  documents,
  groups,
  sections,
  canDownload,
  canUpload,
  canOpenDetails = true,
  detailBase = "/dashboard/documents",
  missing = [],
  children,
  emptyBody = "No documents are available.",
}: {
  title: string;
  documents: ListedDocument[];
  groups?: DocumentGroup[];
  sections?: { label: string; documents: ListedDocument[]; empty?: string }[];
  canDownload: boolean;
  canUpload?: boolean;
  canOpenDetails?: boolean;
  detailBase?: string;
  missing?: string[];
  children?: React.ReactNode;
  emptyBody?: string;
}) {
  const buckets: { label: string; documents: ListedDocument[]; empty?: string }[] = sections
    ?? (groups
      ? groupDocumentsByType(documents, groups).map((group) => ({
          label: group.label,
          documents: group.documents,
        }))
      : [{ label: title, documents }]);

  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-semibold text-navy">{title}</h2>
        {canUpload ? children : null}
      </div>
      {documents.length === 0 && !missing.length && !sections?.some((section) => section.documents.length) ? (
        <EmptyState title="No documents" body={emptyBody} />
      ) : (
        <div className="mt-4 space-y-5">
          {missing.length ? (
            <div>
              <h3 className="text-sm font-semibold text-navy">Missing documents</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                {missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted">File presence is not a compliance determination.</p>
            </div>
          ) : null}
          {buckets.map((bucket) => (
            <div key={bucket.label}>
              {buckets.length > 1 ? <h3 className="text-sm font-semibold text-navy">{bucket.label}</h3> : null}
      {bucket.documents.length === 0 ? (
                <p className="mt-1 text-sm text-muted">{bucket.empty ?? "None"}</p>
              ) : (
                <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                  {bucket.documents.map((document) => (
                    <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div>
                        {canOpenDetails ? (
                          <Link href={`${detailBase}/${document.id}`} className="font-semibold text-navy hover:text-medical">
                            {document.name}
                          </Link>
                        ) : (
                          <p className="font-semibold text-navy">{document.name}</p>
                        )}
                        <p className="text-muted">
                          {labelDocumentCategory(document.category)} · {labelDocumentType(document.documentType)} · {associatedWithLabel(document)}
                        </p>
                        {document.rejectionReason && (document.verificationStatus === "REJECTED" || document.lifecycleStatus === "REJECTED") ? (
                          <p className="text-sm text-navy">Rejected: {document.rejectionReason}</p>
                        ) : null}
                        <DocumentStatusBadge document={document} />
                      </div>
                      <div className="flex gap-2">
                        {canDownload ? (
                          <a href={documentFileHref(document.id)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-medical">
                            View / Download
                          </a>
                        ) : null}
                        {canOpenDetails ? (
                          <Link href={`${detailBase}/${document.id}`} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-medical">
                            Details
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
