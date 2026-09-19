import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatBusinessDateTime } from "@/lib/workforce-time";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Interviews" };

export default async function InterviewsPage() {
  await requirePermission("applicants.view");

  const applications = await prisma.application.findMany({
    where: {
      status: { in: ["INTERVIEW_REQUESTED", "INTERVIEW_SCHEDULED", "UNDER_REVIEW"] },
      interviewStatus: { not: "NOT_REQUESTED" },
    },
    include: {
      applicant: true,
      jobOpening: true,
      interviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Hiring workflow</p>
          <h1 className="mt-2 text-3xl font-semibold text-navy">Interviews</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Open an applicant scorecard, work through the role-specific questions, save progress, and record the final interview review.
          </p>
        </div>
        <Link
          href="/dashboard/applicants"
          className="rounded-full border border-navy px-4 py-2 text-sm font-semibold text-navy"
        >
          View all applicants
        </Link>
      </div>

      <div className="mt-6 space-y-3 md:hidden">
        {applications.length === 0 ? (
          <div className="rounded-2xl border border-line bg-paper px-4 py-8 text-sm text-muted">
            No applicants are currently in the interview workflow.
          </div>
        ) : (
          applications.map((application) => {
            const interview = application.interviews[0] ?? null;
            const score =
              interview?.scorePossible && interview.scorePossible > 0
                ? `${interview.scoreTotal ?? 0}/${interview.scorePossible}`
                : "—";

            return (
              <article key={application.id} className="rounded-2xl border border-line bg-paper p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/applicants/${application.id}`}
                      className="block truncate font-semibold text-navy hover:text-medical"
                    >
                      {application.applicant.legalFirstName} {application.applicant.legalLastName}
                    </Link>
                    <p className="mt-1 text-sm text-muted">{application.jobOpening.title}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-ice px-2.5 py-1 text-xs font-semibold text-navy">
                    {application.interviewStatus.replaceAll("_", " ")}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Worker type</dt>
                    <dd className="mt-1 font-medium text-navy">
                      {application.jobOpening.workerClassification.replaceAll("_", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Score</dt>
                    <dd className="mt-1 font-medium text-navy">{score}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted">Scheduled</dt>
                    <dd className="mt-1 font-medium text-navy">
                      {interview?.scheduledAt ? formatBusinessDateTime(interview.scheduledAt) : "Not scheduled"}
                    </dd>
                  </div>
                </dl>

                <Link
                  href={`/dashboard/applicants/${application.id}/interview`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-medical"
                >
                  Open interview
                </Link>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-line bg-paper md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Worker type</th>
              <th className="px-4 py-3">Interview status</th>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={7}>
                  No applicants are currently in the interview workflow.
                </td>
              </tr>
            ) : (
              applications.map((application) => {
                const interview = application.interviews[0] ?? null;
                const score =
                  interview?.scorePossible && interview.scorePossible > 0
                    ? `${interview.scoreTotal ?? 0}/${interview.scorePossible}`
                    : "—";

                return (
                  <tr key={application.id} className="border-b border-line last:border-0 hover:bg-ice/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/applicants/${application.id}`}
                        className="font-semibold text-navy underline-offset-2 hover:text-medical hover:underline"
                      >
                        {application.applicant.legalFirstName} {application.applicant.legalLastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{application.jobOpening.title}</td>
                    <td className="px-4 py-3">{application.jobOpening.workerClassification.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">{application.interviewStatus.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">
                      {interview?.scheduledAt ? formatBusinessDateTime(interview.scheduledAt) : "—"}
                    </td>
                    <td className="px-4 py-3">{score}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/applicants/${application.id}/interview`}
                        className="inline-flex rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-medical"
                      >
                        Open interview
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
