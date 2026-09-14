import Link from "next/link";
import { applicantSafeStatusLabel } from "@/lib/applications/status";
import { prisma } from "@/lib/db";
import { requirePortal } from "@/lib/rbac";
import { documentReviewState, applicantSafeReviewLabel } from "@/lib/documents/review-status";

export default async function ApplicantDashboardPage() {
  const ctx = await requirePortal("applicant");
  const applicantId = ctx.user.applicantId;
  const applications = applicantId
    ? await prisma.application.findMany({
        where: { applicantId },
        include: {
          jobOpening: { select: { title: true, publicId: true } },
          documents: { include: { document: true } },
          requirementAssignments: { include: { requirement: true } },
        },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-navy">My applications</h1>
        <p className="mt-2 text-sm text-muted">
          Progress is saved on your account so you can resume on another device. Internal reviewer
          notes are not shown here.
        </p>
      </div>
      {applications.length === 0 ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-sm text-muted">You have not started an application yet.</p>
          <Link href="/careers" className="mt-3 inline-block font-semibold text-medical hover:underline">
            Browse open positions
          </Link>
        </section>
      ) : (
        applications.map((application) => {
          const missing = application.requirementAssignments.filter((assignment) => {
            const match = application.documents.find(
              (link) => link.document.documentType === assignment.requirement.documentType,
            );
            return !match || documentReviewState(match.document) === "REJECTED";
          });
          return (
            <section key={application.id} className="rounded-2xl border border-line bg-paper p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-navy">{application.jobOpening.title}</h2>
                  <p className="text-sm text-muted">
                    {applicantSafeStatusLabel(application.status)} · {application.trackingNumber}
                  </p>
                </div>
                <Link
                  href={`/applicant/applications/${application.id}`}
                  className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
                >
                  Open
                </Link>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Uploaded documents</dt>
                  <dd>{application.documents.length}</dd>
                </div>
                <div>
                  <dt className="text-muted">Required actions</dt>
                  <dd>{missing.length}</dd>
                </div>
                <div>
                  <dt className="text-muted">Latest review</dt>
                  <dd>
                    {application.documents[0]
                      ? applicantSafeReviewLabel(documentReviewState(application.documents[0].document))
                      : "No files yet"}
                  </dd>
                </div>
              </dl>
              {application.status === "DRAFT" ? (
                <Link
                  href={`/careers/apply/${application.jobOpening.publicId}`}
                  className="mt-3 inline-block text-sm font-semibold text-medical hover:underline"
                >
                  Resume application
                </Link>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}
