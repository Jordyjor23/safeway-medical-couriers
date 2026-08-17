import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { credentials } from "@/lib/site";

export const metadata: Metadata = {
  title: "Compliance",
  description:
    "HIPAA training, chain of custody, temperature control, and courier standards at Safeway Couriers.",
};

const sections = [
  {
    title: "HIPAA & privacy",
    body: "Couriers are trained not to discuss patient identifiers, to keep paperwork covered, and to hand shipments only to authorized receiving staff. Manifests stay with the run — they are not left on a dashboard.",
  },
  {
    title: "Chain of custody",
    body: "Pickup time, courier name, seal status, and receiving signature are recorded. If a specimen is delayed or temperature is in question, dispatch has a timeline instead of a guess.",
  },
  {
    title: "Biohazard handling",
    body: "Staff complete bloodborne pathogen training. Leaks, broken containers, and unlabeled bags are escalated immediately. We do not improvise with medical waste.",
  },
  {
    title: "Temperature control",
    body: "Frozen, refrigerated, and ambient payloads travel in the cooler specified by the shipper. We do not mix incompatible loads in the same bag to save a stop.",
  },
  {
    title: "Insurance & vehicles",
    body: "Runs are covered by cargo insurance. Vehicles are kept clean, unmarked where required by the client, and stocked with spill kits and extra coolers.",
  },
];

export default function CompliancePage() {
  return (
    <>
      <PageHero
        eyebrow="Compliance"
        title="Trust is operational, not a badge on the homepage."
        description="Hospitals and labs should be able to audit how we train, document, and escalate. These are the standards every Safeway run is built on."
      />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <ul className="mb-12 flex flex-wrap gap-2">
          {credentials.map((item) => (
            <li
              key={item}
              className="rounded-full border border-navy/15 bg-paper px-4 py-2 text-sm font-semibold text-navy"
            >
              {item}
            </li>
          ))}
        </ul>
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-navy/10 bg-paper p-6">
              <h2 className="text-xl font-semibold text-navy">{section.title}</h2>
              <p className="mt-3 leading-relaxed text-muted">{section.body}</p>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
