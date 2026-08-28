import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setJobStatus } from "@/app/(portal)/dashboard/jobs/actions";
import { JobForm } from "@/components/portal/JobForm";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Edit job" };

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const ctx = await requirePermission("jobs.view");
  const { jobId } = await params;
  const [job, categories] = await Promise.all([
    prisma.jobOpening.findUnique({ where: { id: jobId } }),
    prisma.careerCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!job) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard/jobs" className="text-sm font-semibold text-medical hover:underline">
            ← Job postings
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-navy">{job.title}</h1>
          <p className="mt-1 text-sm text-muted">Status: {job.status}</p>
        </div>
        {hasPermission(ctx, "jobs.publish") ? (
          <div className="flex flex-wrap gap-2">
            <StatusButton jobId={job.id} status="PUBLISHED" label="Publish" />
            <StatusButton jobId={job.id} status="PAUSED" label="Pause" />
            <StatusButton jobId={job.id} status="CLOSED" label="Close" />
            <StatusButton jobId={job.id} status="ARCHIVED" label="Archive" />
          </div>
        ) : null}
      </div>
      {hasPermission(ctx, "jobs.edit") ? <JobForm job={job} categories={categories} /> : null}
    </div>
  );
}

function StatusButton({
  jobId,
  status,
  label,
}: {
  jobId: string;
  status: "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED";
  label: string;
}) {
  const action = setJobStatus.bind(null, jobId, status);
  return (
    <form action={action}>
      <button type="submit" className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-navy hover:border-medical">
        {label}
      </button>
    </form>
  );
}
