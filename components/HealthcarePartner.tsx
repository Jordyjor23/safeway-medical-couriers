import { Check } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { partnerHighlights } from "@/lib/site";

export function HealthcarePartner() {
  return (
    <section id="healthcare-partners" className="section-anchor bg-paper py-20">
      <Container>
        <SectionHeading
          eyebrow="Healthcare Partners"
          title="A Courier Partner Built for Healthcare Organizations"
          description="Safeway Couriers understands that healthcare organizations need more than transportation. They need a courier partner with documented procedures, trained personnel, reliable communication, and accountability."
        />
        <p className="mt-6 max-w-3xl text-muted leading-relaxed">
          Our operational standards are designed to support the expectations of
          hospitals, laboratories, pharmacies, physician offices, clinics,
          nursing facilities, and other healthcare organizations.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {partnerHighlights.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl border border-line bg-ice px-4 py-3 text-sm font-medium text-navy"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-medical" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <Link
          href="/quote?reason=compliance"
          className="mt-8 inline-flex rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-medical"
        >
          Request Our Compliance Packet
        </Link>
      </Container>
    </section>
  );
}
