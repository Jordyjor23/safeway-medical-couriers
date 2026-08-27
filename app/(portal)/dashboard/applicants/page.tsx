import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Applicants" };

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; location?: string }>;
}) {
  await requirePermission("applicants.view");
  const params = await searchParams;
  const applications = await prisma.application.findMany({
    where: {
      status: params.status ? { equals: params.status as never } : { not: "DRAFT" },
      jobOpening: params.location ? { location: { contains: params.location, mode: "insensitive" } } : undefined,
    },
    include: {
      applicant: true,
      jobOpening: true,
      assignedReviewer: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Applicants</h1>
      <form className="mt-4 flex flex-wrap gap-3" method="get">
        <input name="location" placeholder="Location" defaultValue={params.location} className="rounded-lg border border-line px-3 py-2 text-sm" />
        <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-line px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUESTED", "INTERVIEW_SCHEDULED", "CONDITIONAL_OFFER", "BACKGROUND_SCREENING", "ONBOARDING", "HIRED", "NOT_SELECTED"].map((status) => (
            <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
          ))}
        </select>
        <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Applied</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3">Interview</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={7}>No applicants match these filters.</td>
              </tr>
            ) : (
              applications.map((application) => (
                <tr key={application.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/applicants/${application.id}`} className="font-medium text-navy hover:text-medical">
                      {application.applicant.legalFirstName} {application.applicant.legalLastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{application.jobOpening.title}</td>
                  <td className="px-4 py-3">{application.submittedAt?.toLocaleDateString() ?? "—"}</td>
                  <td className="px-4 py-3">{application.jobOpening.location}</td>
                  <td className="px-4 py-3">{application.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{application.assignedReviewer?.name ?? "—"}</td>
                  <td className="px-4 py-3">{application.interviewStatus.replaceAll("_", " ")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
