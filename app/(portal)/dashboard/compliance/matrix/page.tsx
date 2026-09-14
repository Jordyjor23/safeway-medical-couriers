import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComplianceLibraryNav } from "@/components/portal/ComplianceLibraryNav";
import { canViewCompanyLibraryAdmin } from "@/lib/compliance/library-access";
import { serviceIsGenerallyAvailable } from "@/lib/compliance/register-catalog";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = { title: "Service authorization matrix" };

export default async function ServiceMatrixPage() {
  const ctx = await requireAuth();
  if (!canViewCompanyLibraryAdmin(ctx.roles)) notFound();
  const rows = await prisma.serviceAuthorization.findMany({
    include: { sourceControlledDocument: true },
    orderBy: { serviceName: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Compliance</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">Service authorization matrix</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Statuses are the SC-MCM-001 package values from the owner brief. Seed does not change an
          existing status. PROHIBITED, DEFERRED, and REJECT_HOLD are not generally available.
          Rows stay inactive until the master is uploaded and the owner activates services.
        </p>
        <ComplianceLibraryNav current="/dashboard/compliance/matrix" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Generally available</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Activation rule</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={6}>
                  Matrix templates appear after seed and remain inactive until master upload.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-4 py-3 font-medium text-navy">{row.serviceName}</td>
                  <td className="px-4 py-3">{row.serviceCode}</td>
                  <td className="px-4 py-3">
                    {row.status.replaceAll("_", " ")}
                    {row.active ? "" : " · inactive"}
                  </td>
                  <td className="px-4 py-3">{serviceIsGenerallyAvailable(row.status) ? "Conditional / authorized path" : "No"}</td>
                  <td className="px-4 py-3">{row.sourceControlledDocument?.controlledDocumentId ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{row.activationRule}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
