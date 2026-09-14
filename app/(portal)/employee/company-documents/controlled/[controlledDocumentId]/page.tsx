import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { acknowledgeAssignedControlledDocumentAction } from "@/app/(portal)/employee/company-documents/actions";
import { COMPANY_ACKNOWLEDGMENT_DISCLAIMER, COMPANY_ACKNOWLEDGMENT_TEXT } from "@/lib/compliance/library-catalog";
import { canAccessAssignedControlledDocument } from "@/lib/compliance/library-access";
import { companyActorFromDocumentActor, loadControlledAssignments } from "@/lib/compliance/library";
import { prisma } from "@/lib/db";
import { requirePortal } from "@/lib/rbac";

export const metadata: Metadata = { title: "Assigned controlled document" };

export default async function EmployeeControlledDocumentPage({
  params,
}: {
  params: Promise<{ controlledDocumentId: string }>;
}) {
  const ctx = await requirePortal("employee");
  const { controlledDocumentId } = await params;
  const row = await prisma.controlledDocument.findUnique({
    where: { id: controlledDocumentId },
    include: {
      sourceManagedDocument: true,
      acknowledgments: { where: { userId: ctx.user.id } },
    },
  });
  if (!row) notFound();
  const assignments = await loadControlledAssignments(row.id);
  const actor = await companyActorFromDocumentActor(ctx);
  if (
    !canAccessAssignedControlledDocument({
      roles: ctx.roles,
      status: row.status,
      active: row.active,
      assignments,
      actor,
      controlledDocumentId: row.id,
    })
  ) {
    notFound();
  }
  const acknowledged = row.acknowledgments[0];
  const needsAck = assignments.some((assignment) => assignment.active && ["READ_AND_ACKNOWLEDGE", "SIGN"].includes(assignment.action));

  return (
    <div className="space-y-6">
      <Link href="/employee/dashboard" className="text-sm font-semibold text-medical hover:underline">
        ← My portal
      </Link>
      <h1 className="text-3xl font-semibold text-navy">{row.controlledDocumentId}</h1>
      <p className="text-lg text-navy">{row.title}</p>
      <p className="text-sm text-muted">
        Revision {row.revision} · {row.documentType.replaceAll("_", " ")} · {row.status}
      </p>
      <p className="max-w-3xl text-sm text-muted">
        {row.description || "Review this assigned controlled section. Acknowledging it does not acknowledge the entire master manual."}
      </p>
      {row.sourceManagedDocumentId ? (
        <Link
          href={`/api/portal/documents/${row.sourceManagedDocumentId}/file`}
          className="inline-flex rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          View shared master file
        </Link>
      ) : (
        <p className="text-sm text-muted">The master source file is not available yet.</p>
      )}
      {needsAck ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-semibold text-navy">Acknowledgment</h2>
          <p className="mt-2 text-sm text-muted">{COMPANY_ACKNOWLEDGMENT_TEXT}</p>
          <p className="mt-2 text-xs text-muted">{COMPANY_ACKNOWLEDGMENT_DISCLAIMER}</p>
          {acknowledged ? (
            <p className="mt-3 text-sm text-navy">
              Recorded {acknowledged.createdAt.toLocaleString()} for {acknowledged.controlledDocumentKey} revision {acknowledged.controlledDocumentRevision}.
            </p>
          ) : (
            <form action={acknowledgeAssignedControlledDocumentAction} className="mt-4">
              <input type="hidden" name="controlledDocumentId" value={row.id} />
              <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
                I acknowledge that I received and reviewed this document
              </button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
