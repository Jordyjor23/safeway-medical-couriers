import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Job postings" };

export default async function JobsAdminPage() {
  const ctx = await requirePermission("jobs.view");
  const jobs = await prisma.jobOpening.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-navy">Job postings</h1>
          <p className="mt-2 text-sm text-muted">
            Publish openings here. The public Careers page only shows published jobs.
          </p>
        </div>
        {hasPermission(ctx, "jobs.create") ? (
          <Link
            href="/dashboard/jobs/new"
            className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-medical"
          >
            New job
          </Link>
        ) : null}
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Classification</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={4}>
                  No job postings yet.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/jobs/${job.id}`} className="font-medium text-navy hover:text-medical">
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {job.workerClassification === "INDEPENDENT_CONTRACTOR" ? "Independent contractor" : "Employee"}
                  </td>
                  <td className="px-4 py-3">{job.location}</td>
                  <td className="px-4 py-3">{job.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
