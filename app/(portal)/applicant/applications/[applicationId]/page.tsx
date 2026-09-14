import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentUploader } from "@/components/portal/DocumentUploader";
import { applicantSafeStatusLabel } from "@/lib/applications/status";
import { canAccessApplication } from "@/lib/applications/authorization";
import { prisma } from "@/lib/db";
import { requirePortal } from "@/lib/rbac";
import { documentReviewState, applicantSafeReviewLabel } from "@/lib/documents/review-status";
import { labelDocumentType } from "@/lib/documents/catalog";
import { documentFileHref } from "@/lib/documents/display";

export default async function ApplicantApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const ctx = await requirePortal("applicant");
  const { applicationId } = await params;
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      applicant: true,
      jobOpening: true,
      documents: { include: { document: true } },
      requirementAssignments: { include: { requirement: true } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      notes: { where: { visibleToApplicant: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!application || !canAccessApplication(ctx, application)) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/applicant/dashboard" className="text-sm font-semibold text-medical hover:underline">
          ← My applications
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-navy">{application.jobOpening.title}</h1>
        <p className="mt-1 text-muted">
          {applicantSafeStatusLabel(application.status)} · {application.trackingNumber}
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Required documents</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {application.requirementAssignments.map((assignment) => {
            const match = application.documents.find(
              (link) => link.document.documentType === assignment.requirement.documentType,
            );
            const state = documentReviewState(match?.document ?? null);
            return (
              <li key={assignment.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-ice px-3 py-2">
                <span>{assignment.requirement.name}</span>
                <span className="text-muted">{applicantSafeReviewLabel(state)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          <DocumentUploader
            associations={{ employee: false, customer: false, contract: false, delivery: false }}
            preset={{
              category: "APPLICANT",
              applicationId: application.id,
              applicantId: application.applicantId,
            }}
            triggerLabel="Upload document"
            detailBasePath="/applicant/documents"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Your files</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {application.documents.map((link) => (
            <li key={link.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {link.document.name} · {labelDocumentType(link.document.documentType)} ·{" "}
                {applicantSafeReviewLabel(documentReviewState(link.document))}
              </span>
              <a href={documentFileHref(link.document.id)} className="font-semibold text-medical hover:underline">
                View
              </a>
            </li>
          ))}
        </ul>
        {application.documents.some((link) => link.document.rejectionReason) ? (
          <p className="mt-3 text-sm text-red-700">
            A reviewer asked for a replacement. Upload a new file for the rejected document type.
          </p>
        ) : null}
      </section>

      {application.notes.length ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-semibold text-navy">Messages</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {application.notes.map((note) => (
              <li key={note.id}>{note.body}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Status history</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {application.statusHistory.map((item) => (
            <li key={item.id}>
              {item.createdAt.toLocaleString()} · {applicantSafeStatusLabel(item.toStatus)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
