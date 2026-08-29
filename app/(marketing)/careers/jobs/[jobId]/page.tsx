import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { compensationLabel, getPublishedJobByPublicId } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jobId: string }>;
}): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getPublishedJobByPublicId(jobId);
  if (!job) return { title: "Position" };
  return {
    title: job.title,
    description: job.description.slice(0, 160),
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await getPublishedJobByPublicId(jobId);
  if (!job) notFound();

  const contractor = job.workerClassification === "INDEPENDENT_CONTRACTOR";

  return (
    <>
      <PageHeader
        eyebrow={contractor ? "Independent contractor" : "Employment opportunity"}
        title={job.title}
        description={`${job.location} · ${job.department}`}
      />
      <Container className="mkt-split-sidebar grid gap-10 py-16 lg:grid-cols-2">
        <article className="space-y-6 leading-relaxed text-mist-soft">
          <p>{job.description}</p>
          <section>
            <h2 className="text-xl font-semibold text-mist">Essential duties</h2>
            <p className="mt-2 whitespace-pre-wrap">{job.essentialDuties}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-mist">Minimum qualifications</h2>
            <p className="mt-2 whitespace-pre-wrap">{job.minimumQualifications}</p>
          </section>
          {job.preferredQualifications ? (
            <section>
              <h2 className="text-xl font-semibold text-mist">Preferred qualifications</h2>
              <p className="mt-2 whitespace-pre-wrap">{job.preferredQualifications}</p>
            </section>
          ) : null}
          {job.physicalRequirements ? (
            <section>
              <h2 className="text-xl font-semibold text-mist">Physical / job requirements</h2>
              <p className="mt-2 whitespace-pre-wrap">{job.physicalRequirements}</p>
            </section>
          ) : null}
        </article>
        <aside className="h-fit rounded-2xl border border-white/10 bg-panel p-5">
          <p className="text-sm font-semibold text-mist">Compensation</p>
          <p className="mt-2 text-sm text-mist-soft">{compensationLabel(job)}</p>
          <p className="mt-4 text-sm text-mist-soft">{job.schedule ?? "Schedule is described in the posting."}</p>
          <Link
            href={`/careers/apply/${job.publicId}`}
            className="mkt-btn mkt-btn-primary mt-6 w-full"
          >
            Apply
          </Link>
        </aside>
      </Container>
    </>
  );
}
