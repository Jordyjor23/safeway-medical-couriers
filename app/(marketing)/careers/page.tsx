import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { WHY_WORK_ITEMS } from "@/lib/careers-content";
import { compensationLabel, getCareerCategories, getPublishedJobs } from "@/lib/jobs";
import { getCurrentLegalDocument, getSetting } from "@/lib/settings";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Careers",
  description: `Careers and independent contractor opportunities with ${site.name} in Columbus and Central Ohio.`,
};

export default async function CareersPage() {
  const [jobs, categories, careers, eeo] = await Promise.all([
    getPublishedJobs(),
    getCareerCategories(),
    getSetting("careers", {
      heroHeadline: "Deliver More Than Packages. Deliver With Purpose.",
      heroBody:
        "Safeway Couriers provides secure, dependable and professional courier services specializing in healthcare, medical, time-sensitive and business deliveries.",
      primaryCta: "View Open Positions",
      secondaryCta: "Join Our Courier Network",
      accommodationEmail: site.email,
    }),
    getCurrentLegalDocument("eeo"),
  ]);

  const employmentJobs = jobs.filter((job) => job.workerClassification === "EMPLOYEE");
  const contractorJobs = jobs.filter((job) => job.workerClassification === "INDEPENDENT_CONTRACTOR");
  const employmentCategories = categories.filter((item) => item.opportunityType === "EMPLOYMENT");
  const contractorCategories = categories.filter((item) => item.opportunityType === "INDEPENDENT_CONTRACTOR");

  return (
    <>
      <section className="bg-navy text-white">
        <Container className="grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
              Careers · {site.region}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">
              {careers.heroHeadline}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              {careers.heroBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#open-positions"
                className="inline-flex items-center gap-2 rounded-full bg-medical px-5 py-3 text-sm font-semibold text-white transition hover:bg-medical-bright"
              >
                {careers.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#independent-contractors"
                className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/5"
              >
                {careers.secondaryCta}
              </a>
            </div>
          </div>
          <div className="rounded-3xl bg-navy-mid p-8 ring-1 ring-white/10">
            <p className="text-sm leading-relaxed text-white/80">
              Employment opportunities and independent contractor opportunities are listed
              separately. Compensation shown for a category is a suggested range for that type of
              role, not a guarantee of hours, benefits, or pay.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-ice py-16">
        <Container>
          <SectionHeading
            eyebrow="Why Safeway Couriers"
            title="Why work with Safeway Couriers"
            description="Professional courier work supporting healthcare and time-sensitive business deliveries. Specific hours, benefits, and pay are described only in a posted opening or a written offer."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_WORK_ITEMS.map((item) => (
              <article key={item.title} className="rounded-2xl border border-line bg-paper p-5">
                <h3 className="font-semibold text-navy">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-paper py-16">
        <Container>
          <SectionHeading
            eyebrow="Career categories"
            title="Employment opportunities"
            description="These categories can be configured by Safeway Couriers administration. Open jobs are listed below when a position is published."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {employmentCategories.map((category) => (
              <article key={category.id} className="rounded-2xl border border-line p-5">
                <h3 className="font-semibold text-navy">{category.name}</h3>
                <p className="mt-2 text-sm text-muted">{category.summary}</p>
                <p className="mt-3 text-sm font-medium text-medical">{category.compensationDisplay}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="independent-contractors" className="section-anchor bg-ice py-16">
        <Container>
          <SectionHeading
            eyebrow="Contractor path"
            title="Independent contractor opportunities"
            description="Independent courier partners are not hourly employees. Classification, schedule, and pay depend on the written contractor arrangement for each assignment."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {contractorCategories.map((category) => (
              <article key={category.id} className="rounded-2xl border border-line bg-paper p-5">
                <h3 className="font-semibold text-navy">{category.name}</h3>
                <p className="mt-2 text-sm text-muted">{category.summary}</p>
                <p className="mt-3 text-sm font-medium text-medical">{category.compensationDisplay}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="open-positions" className="section-anchor bg-paper py-16">
        <Container>
          <SectionHeading
            eyebrow="Open positions"
            title="Current openings"
            description="Job listings are managed in the business portal. This page does not hard-code openings."
          />
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-navy">Employment openings</h3>
              {employmentJobs.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No published employment openings at this time.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {employmentJobs.map((job) => (
                    <li key={job.id}>
                      <Link
                        href={`/careers/jobs/${job.publicId}`}
                        className="block rounded-2xl border border-line p-5 hover:border-medical"
                      >
                        <p className="font-semibold text-navy">{job.title}</p>
                        <p className="mt-1 text-sm text-muted">
                          {job.location} · {job.employmentType.replaceAll("_", " ").toLowerCase()}
                        </p>
                        <p className="mt-2 text-sm text-medical">{compensationLabel(job)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-navy">Independent contractor openings</h3>
              {contractorJobs.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  No published independent contractor openings at this time.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {contractorJobs.map((job) => (
                    <li key={job.id}>
                      <Link
                        href={`/careers/jobs/${job.publicId}`}
                        className="block rounded-2xl border border-line p-5 hover:border-medical"
                      >
                        <p className="font-semibold text-navy">{job.title}</p>
                        <p className="mt-1 text-sm text-muted">{job.location} · Independent contractor</p>
                        <p className="mt-2 text-sm text-medical">{compensationLabel(job)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="mt-8 text-sm text-muted">
            Need an accommodation during the application process? Contact{" "}
            <a className="font-semibold text-medical" href={`mailto:${careers.accommodationEmail}`}>
              {careers.accommodationEmail}
            </a>
            . Check status with your tracking number on the{" "}
            <Link href="/careers/status" className="font-semibold text-medical">
              application status
            </Link>{" "}
            page.
          </p>
          {eeo ? <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted">{eeo.body}</p> : null}
        </Container>
      </section>
    </>
  );
}
