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
      <Container className="grid gap-10 py-16 lg:grid-cols-[1fr_18rem]">
        <article className="space-y-6 text-muted leading-relaxed">
          <p>{job.description}</p>
          <section>
            <h2 className="text-xl font-semibold text-navy">Essential duties</h2>
            <p className="mt-2 whitespace-pre-wrap">{job.essentialDuties}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-navy">Minimum qualifications</h2>
            <p className="mt-2 whitespace-pre-wrap">{job.minimumQualifications}</p>
          </section>
          {job.preferredQualifications ? (
            <section>
              <h2 className="text-xl font-semibold text-navy">Preferred qualifications</h2>
              <p className="mt-2 whitespace-pre-wrap">{job.preferredQualifications}</p>
            </section>
          ) : null}
          {job.physicalRequirements ? (
            <section>
              <h2 className="text-xl font-semibold text-navy">Physical / job requirements</h2>
              <p className="mt-2 whitespace-pre-wrap">{job.physicalRequirements}</p>
            </section>
          ) : null}
        </article>
        <aside className="h-fit rounded-2xl border border-line bg-paper p-5">
          <p className="text-sm font-semibold text-navy">Compensation</p>
          <p className="mt-2 text-sm text-muted">{compensationLabel(job)}</p>
          <p className="mt-4 text-sm text-muted">{job.schedule ?? "Schedule is described in the posting."}</p>
          <Link
            href={`/careers/apply/${job.publicId}`}
            className="mt-6 inline-flex w-full justify-center rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white hover:bg-medical"
          >
            Apply
          </Link>
        </aside>
      </Container>
    </>
  );
}
