import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { services } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "STAT, lab specimen, pharmacy, scheduled route, and after-hours medical courier services from Safeway Couriers.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Medical courier work for every clock on the floor."
        description="STAT when a specimen cannot wait. Scheduled routes when the lab cutoff is immovable. Temperature control when the payload is the result."
      />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6">
        {services.map((service) => (
          <article
            key={service.title}
            id={service.href.split("#")[1]}
            className="scroll-mt-28 rounded-2xl border border-navy/10 bg-paper p-8"
          >
            <h2 className="display text-3xl text-navy">{service.title}</h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-muted">{service.details}</p>
          </article>
        ))}
        <div className="rounded-2xl bg-navy p-8 text-white">
          <h2 className="display text-3xl">Ready to set up an account or a one-off STAT?</h2>
          <p className="mt-3 text-white/75">
            Tell us your facilities, cutoff times, and temperature requirements.
          </p>
          <Link
            href="/quote"
            className="mt-6 inline-flex rounded-full bg-teal px-5 py-3 text-sm font-semibold hover:bg-teal-bright hover:text-navy"
          >
            Request a quote
          </Link>
        </div>
      </div>
    </>
  );
}
