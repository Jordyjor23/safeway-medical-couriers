import type { Metadata } from "next";
import Link from "next/link";
import { daysRemainingLabel } from "@/lib/documents/alert-stats";
import { labelDocumentType } from "@/lib/documents/catalog";
import { associatedWithLabel, expirationLabel } from "@/lib/documents/display";
import { documentDetailHref } from "@/lib/documents/paths";
import { DOCUMENT_LIST_INCLUDE, documentLibraryWhere } from "@/lib/documents/query";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Document alerts" };

export default async function DocumentAlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePermission("documents.view");
  const params = await searchParams;
  const where = documentLibraryWhere(ctx, {
    employee: params.employee,
    documentType: params.documentType,
    expirationWindow: params.expirationWindow,
    complianceState: params.complianceState,
    archived: "active",
  });
  const documents = await prisma.managedDocument.findMany({
    where,
    include: DOCUMENT_LIST_INCLUDE,
    orderBy: [{ expirationDate: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  const notifications = await prisma.notification.findMany({
    where: {
      type: { in: ["DOCUMENT_EXPIRING", "DOCUMENT_EXPIRED", "REQUIRED_DOCUMENT_MISSING", "DOCUMENT_NEEDS_REVIEW", "COMPLIANCE_ACTION_REQUIRED", "COMPLIANCE_NON_COMPLIANT"] },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { createdAt: true, thresholdKey: true, type: true, href: true, title: true },
  });

  const rows = documents
    .map((document) => {
      const related = notifications.filter((item) => item.href?.includes(document.id) || item.title.includes(document.name));
      const last = related[0] ?? null;
      return { document, last };
    })
    .filter((row) => {
      if (params.notificationState === "reminded") return Boolean(row.last);
      if (params.notificationState === "none") return !row.last;
      return true;
    });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-navy">Document alerts</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Expiration, missing requirements, and reminder state. File presence is not a compliance determination.
          </p>
        </div>
        <Link href="/dashboard/documents" className="text-sm font-semibold text-medical hover:underline">
          Document library
        </Link>
      </div>

      <form className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2 lg:grid-cols-5" method="get">
        <label className="text-sm font-semibold text-navy">
          Employee
          <input name="employee" defaultValue={params.employee} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-semibold text-navy">
          Type
          <input name="documentType" defaultValue={params.documentType} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-semibold text-navy">
          Compliance state
          <select name="complianceState" defaultValue={params.complianceState ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="expiring">Expiring</option>
            <option value="expired">Expired</option>
            <option value="rejected">Rejected</option>
            <option value="needs_review">Needs review</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Expiration window
          <select name="expirationWindow" defaultValue={params.expirationWindow ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="30">30 days</option>
            <option value="14">14 days</option>
            <option value="7">7 days</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Notification state
          <select name="notificationState" defaultValue={params.notificationState ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="reminded">Reminder sent</option>
            <option value="none">No reminder yet</option>
          </select>
        </label>
        <button className="self-end rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Requirement / type</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expiration</th>
              <th className="px-4 py-3">Days remaining</th>
              <th className="px-4 py-3">Last reminder</th>
              <th className="px-4 py-3">Next escalation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ document, last }) => (
              <tr key={document.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{associatedWithLabel(document)}</td>
                <td className="px-4 py-3">{labelDocumentType(document.documentType)}</td>
                <td className="px-4 py-3">
                  <Link href={documentDetailHref("staff", document.id)} className="font-medium text-navy hover:text-medical">
                    {document.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{expirationLabel(document)}</td>
                <td className="px-4 py-3">{document.expirationDate?.toLocaleDateString() ?? "—"}</td>
                <td className="px-4 py-3">{daysRemainingLabel(document.expirationDate)}</td>
                <td className="px-4 py-3">{last ? last.createdAt.toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3">{last?.thresholdKey ? `After ${last.thresholdKey}` : "Per reminder rules"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
