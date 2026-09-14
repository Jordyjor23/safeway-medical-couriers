import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { acknowledgeAssignedDocumentAction } from "@/app/(portal)/employee/company-documents/actions";
import { COMPANY_ACKNOWLEDGMENT_DISCLAIMER, COMPANY_ACKNOWLEDGMENT_TEXT } from "@/lib/compliance/library-catalog";
import { canAccessAssignedCompanyDocument } from "@/lib/compliance/library-access";
import { companyActorFromDocumentActor, loadCompanyAssignments } from "@/lib/compliance/library";
import { prisma } from "@/lib/db";
import { requirePortal } from "@/lib/rbac";

export const metadata: Metadata = { title: "Company document" };

export default async function EmployeeCompanyDocumentPage({
  params,
}: {
  params: Promise<{ companyDocumentId: string }>;
}) {
  const ctx = await requirePortal("employee");
  const { companyDocumentId } = await params;
  const row = await prisma.companyDocument.findUnique({
    where: { id: companyDocumentId },
    include: {
      document: true,
      acknowledgments: { where: { userId: ctx.user.id } },
    },
  });
  if (!row) notFound();
  const assignments = await loadCompanyAssignments(row.familyKey);
  const actor = await companyActorFromDocumentActor(ctx);
  if (
    !canAccessAssignedCompanyDocument({
      roles: ctx.roles,
      publicationStatus: row.publicationStatus,
      assignments,
      actor,
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
      <h1 className="text-3xl font-semibold text-navy">{row.title}</h1>
      <p className="text-sm text-muted">
        Revision {row.revision} · {row.purpose.replaceAll("_", " ")} · {row.publicationStatus}
      </p>
      <p className="max-w-3xl text-sm text-muted">{row.description || "Review the attached company document."}</p>
      <Link
        href={`/api/portal/documents/${row.documentId}/file`}
        className="inline-flex rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
      >
        View assigned document
      </Link>
      {needsAck ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-semibold text-navy">Acknowledgment</h2>
          <p className="mt-2 text-sm text-muted">{COMPANY_ACKNOWLEDGMENT_TEXT}</p>
          <p className="mt-2 text-xs text-muted">{COMPANY_ACKNOWLEDGMENT_DISCLAIMER}</p>
          {acknowledged ? (
            <p className="mt-3 text-sm text-navy">
              Recorded {acknowledged.createdAt.toLocaleString()} for revision {acknowledged.documentRevision}.
            </p>
          ) : (
            <form action={acknowledgeAssignedDocumentAction} className="mt-4">
              <input type="hidden" name="companyDocumentId" value={row.id} />
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
