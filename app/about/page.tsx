import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${site.name} — a medical courier company built for hospitals, labs, and pharmacies.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="A courier company that understands a missed cutoff is not a late package."
        description="Safeway Couriers exists for the work that cannot go through a general delivery network: specimens, specialty meds, and STAT supplies that are tied to a patient, a surgery, or a lab result."
      />
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-16 sm:px-6">
        <section>
          <h2 className="display text-3xl text-navy">How we work</h2>
          <p className="mt-4 leading-relaxed text-muted">
            We staff a live dispatch desk, train couriers on HIPAA and bloodborne
            pathogen protocol, and treat every handoff as a documented event.
            Account customers get named coordinators who already know your docks,
            your coolers, and your after-hours quirks.
          </p>
        </section>
        <section>
          <h2 className="display text-3xl text-navy">Who we serve</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
            <li>Hospital labs and nursing units that need STAT pickup</li>
            <li>Reference laboratories with daily draw-station circuits</li>
            <li>Retail, hospital, and specialty pharmacies</li>
            <li>Surgery centers, infusion clinics, and physician groups</li>
            <li>Biotech and research sites moving time-sensitive samples</li>
          </ul>
        </section>
        <section>
          <h2 className="display text-3xl text-navy">Coverage</h2>
          <p className="mt-4 leading-relaxed text-muted">
            We run dedicated medical routes across the region and arrange longer
            STAT transfers when a specimen or specialty medication cannot wait
            for the next commercial option. Tell dispatch your facilities and we
            will map pickup windows around your lab cutoffs.
          </p>
        </section>
      </div>
    </>
  );
}
