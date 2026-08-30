import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { WHY_WORK_ITEMS } from "@/lib/careers-content";
import { compensationLabel, getCareerCategories, getPublishedJobs } from "@/lib/jobs";
import { getCurrentLegalDocument, getSetting } from "@/lib/settings";
import { site, publishedContactEmail } from "@/lib/site";

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

  const contactEmail = publishedContactEmail(careers.accommodationEmail);
  const employmentJobs = jobs.filter((job) => job.workerClassification === "EMPLOYEE");
  const contractorJobs = jobs.filter((job) => job.workerClassification === "INDEPENDENT_CONTRACTOR");
  const employmentCategories = categories.filter((item) => item.opportunityType === "EMPLOYMENT");
  const contractorCategories = categories.filter((item) => item.opportunityType === "INDEPENDENT_CONTRACTOR");

  return (
    <>
      <section className="relative overflow-hidden bg-void text-mist">
        <div className="mkt-grid pointer-events-none absolute inset-0 opacity-30" />
        <Container className="relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
              Careers · {site.region}
            </p>
            <h1 className="mt-4 max-w-[16ch] text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              {careers.heroHeadline}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-mist-soft sm:text-lg">
              {careers.heroBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#open-positions" className="mkt-btn mkt-btn-primary">
                {careers.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#independent-contractors" className="mkt-btn mkt-btn-secondary">
                {careers.secondaryCta}
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-graphite p-8">
            <p className="text-sm leading-relaxed text-white/80">
              Employment opportunities and independent contractor opportunities are listed
              separately. Compensation shown for a category is a suggested range for that type of
              role, not a guarantee of hours, benefits, or pay.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-charcoal py-20">
        <Container>
          <SectionHeading
            light
            eyebrow="Why Safeway Couriers"
            title="Why work with Safeway Couriers"
            description="Professional courier work supporting healthcare and time-sensitive business deliveries. Specific hours, benefits, and pay are described only in a posted opening or a written offer."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_WORK_ITEMS.map((item) => (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-graphite p-5">
                <h3 className="font-semibold text-mist">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist-soft">{item.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-void py-20">
        <Container>
          <SectionHeading
            light
            eyebrow="Career categories"
            title="Employment opportunities"
            description="These categories can be configured by Safeway Couriers administration. Open jobs are listed below when a position is published."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {employmentCategories.map((category) => (
              <article key={category.id} className="rounded-2xl border border-white/10 bg-graphite p-5">
                <h3 className="font-semibold text-mist">{category.name}</h3>
                <p className="mt-2 text-sm text-mist-soft">{category.summary}</p>
                <p className="mt-3 text-sm font-medium text-medical-bright">{category.compensationDisplay}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="independent-contractors" className="section-anchor bg-charcoal py-20">
        <Container>
          <SectionHeading
            light
            eyebrow="Contractor path"
            title="Independent contractor opportunities"
            description="Independent courier partners are not hourly employees. Classification, schedule, and pay depend on the written contractor arrangement for each assignment."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {contractorCategories.map((category) => (
              <article key={category.id} className="rounded-2xl border border-white/10 bg-graphite p-5">
                <h3 className="font-semibold text-mist">{category.name}</h3>
                <p className="mt-2 text-sm text-mist-soft">{category.summary}</p>
                <p className="mt-3 text-sm font-medium text-medical-bright">{category.compensationDisplay}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="open-positions" className="section-anchor bg-void py-20">
        <Container>
          <SectionHeading
            light
            eyebrow="Open positions"
            title="Current openings"
            description="Job listings are managed in the business portal. This page does not hard-code openings."
          />
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-mist">Employment openings</h3>
              {employmentJobs.length === 0 ? (
                <p className="mt-3 text-sm text-mist-soft">No published employment openings at this time.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {employmentJobs.map((job) => (
                    <li key={job.id}>
                      <Link
                        href={`/careers/jobs/${job.publicId}`}
                        className="block rounded-2xl border border-white/10 bg-graphite p-5 transition hover:border-medical/50"
                      >
                        <p className="font-semibold text-mist">{job.title}</p>
                        <p className="mt-1 text-sm text-mist-soft">
                          {job.location} · {job.employmentType.replaceAll("_", " ").toLowerCase()}
                        </p>
                        <p className="mt-2 text-sm text-medical-bright">{compensationLabel(job)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-mist">Independent contractor openings</h3>
              {contractorJobs.length === 0 ? (
                <p className="mt-3 text-sm text-mist-soft">
                  No published independent contractor openings at this time.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {contractorJobs.map((job) => (
                    <li key={job.id}>
                      <Link
                        href={`/careers/jobs/${job.publicId}`}
                        className="block rounded-2xl border border-white/10 bg-graphite p-5 transition hover:border-medical/50"
                      >
                        <p className="font-semibold text-mist">{job.title}</p>
                        <p className="mt-1 text-sm text-mist-soft">{job.location} · Independent contractor</p>
                        <p className="mt-2 text-sm text-medical-bright">{compensationLabel(job)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="mt-8 text-sm text-mist-soft">
            Need an accommodation during the application process? Contact{" "}
            <a className="font-semibold text-medical-bright" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
            . Check status with your tracking number on the{" "}
            <Link href="/careers/status" className="font-semibold text-medical-bright">
              application status
            </Link>{" "}
            page.
          </p>
          {eeo ? <p className="mt-6 max-w-3xl text-sm leading-relaxed text-mist-soft">{eeo.body}</p> : null}
        </Container>
      </section>
    </>
  );
}
