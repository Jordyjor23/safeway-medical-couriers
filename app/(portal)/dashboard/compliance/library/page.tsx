import type { Metadata } from "next";
import Link from "next/link";
import { DocumentStatusBadge } from "@/components/portal/DocumentStatusBadge";
import { documentsListWhere, DOCUMENT_LIST_INCLUDE } from "@/lib/documents/query";
import { associatedWithLabel, expirationLabel } from "@/lib/documents/display";
import { labelDocumentCategory, labelDocumentType } from "@/lib/documents/catalog";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Compliance library" };

const groups = [
  { category: "POLICIES", label: "Policies", description: "Company policies, acknowledgments, and controlled policy files." },
  { category: "SOPS", label: "SOPs", description: "Standard operating procedures and operational references." },
  { category: "TRAINING", label: "Training", description: "Training certificates, curriculum, and training records." },
  { category: "COMPLIANCE", label: "Compliance", description: "Chain-of-custody, specimen, incident, and compliance records." },
  { category: "CORPORATE", label: "Corporate", description: "Business registrations, permits, vendor registrations, and corporate records." },
] as const;

export default async function ComplianceLibraryPage() {
  const ctx = await requirePermission("compliance.view");
  const allowed = documentsListWhere(ctx);

  const [counts, recent] = await Promise.all([
    Promise.all(
      groups.map(async (group) => ({
        ...group,
        count: await prisma.managedDocument.count({
          where: {
            AND: [allowed, { category: group.category }, { archivedAt: null }],
          },
        }),
      })),
    ),
    prisma.managedDocument.findMany({
      where: {
        AND: [
          allowed,
          { category: { in: groups.map((group) => group.category) } },
          { archivedAt: null },
        ],
      },
      include: DOCUMENT_LIST_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard/compliance" className="text-sm font-semibold text-medical hover:underline">
            ← Compliance tracking
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-navy">Compliance library</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            A secure index of Safeway policies, SOPs, training, compliance, and corporate records.
            Files remain in the existing private document system with the same permissions, archive history, and audit controls.
          </p>
        </div>
        <Link
          href="/dashboard/documents"
          className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-medical"
        >
          Open full document library
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {counts.map((group) => (
          <Link
            key={group.category}
            href={`/dashboard/documents?category=${group.category}`}
            className="rounded-2xl border border-line bg-paper p-5 transition hover:border-medical"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
            <p className="mt-2 text-3xl font-semibold text-navy">{group.count}</p>
            <p className="mt-2 text-sm text-muted">{group.description}</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-navy">Recently added</h2>
          <p className="mt-1 text-sm text-muted">Newest authorized compliance-library files.</p>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">
            No policy, SOP, training, compliance, or corporate files have been uploaded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Associated with</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((document) => (
                  <tr key={document.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/documents/${document.id}`}
                        className="font-semibold text-navy hover:text-medical"
                      >
                        {document.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{labelDocumentCategory(document.category)}</td>
                    <td className="px-4 py-3">{labelDocumentType(document.documentType)}</td>
                    <td className="px-4 py-3">{associatedWithLabel(document)}</td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge document={document} />
                      <span className="ml-2 text-xs text-muted">{expirationLabel(document)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
