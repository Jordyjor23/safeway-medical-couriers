import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComplianceLibraryNav } from "@/components/portal/ComplianceLibraryNav";
import { canViewCompanyLibraryAdmin } from "@/lib/compliance/library-access";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = { title: "Controlled document register" };

export default async function ControlledRegisterPage() {
  const ctx = await requireAuth();
  if (!canViewCompanyLibraryAdmin(ctx.roles)) notFound();
  const records = await prisma.controlledDocument.findMany({
    include: {
      parentCompanyDocument: { select: { id: true, title: true, revision: true } },
      sourceManagedDocument: { select: { id: true, originalFileName: true } },
      assignments: { where: { active: true } },
      acknowledgments: true,
    },
    orderBy: { controlledDocumentId: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Compliance</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">Controlled document register</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          SC-MCM-001 package templates. Records stay pending-source and inactive until the owner
          uploads the master file. Multiple controlled IDs share that one ManagedDocument — no
          duplicate Blob objects are created for sections.
        </p>
        <ComplianceLibraryNav current="/dashboard/compliance/register" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Revision</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Assignments</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={6}>
                  Register templates appear after seed. They remain pending-source until the master file is uploaded.
                </td>
              </tr>
            ) : (
              records.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-navy">
                    <Link href={`/dashboard/compliance/register/${row.id}`} className="hover:text-medical">
                      {row.controlledDocumentId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.title}</td>
                  <td className="px-4 py-3">{row.revision}</td>
                  <td className="px-4 py-3">
                    {row.status}
                    {row.active ? "" : " · inactive"}
                  </td>
                  <td className="px-4 py-3">
                    {row.sourceManagedDocument
                      ? row.parentCompanyDocument?.title ?? row.sourceManagedDocument.originalFileName
                      : "Awaiting master ManagedDocument"}
                  </td>
                  <td className="px-4 py-3">
                    {row.assignments.length} · {row.acknowledgments.length} acks
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
