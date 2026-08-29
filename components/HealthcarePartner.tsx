import { Check } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { partnerHighlights } from "@/lib/site";

export function HealthcarePartner() {
  return (
    <section id="healthcare-partners" className="section-anchor bg-charcoal py-24">
      <Container>
        <Reveal>
          <SectionHeading
            light
            eyebrow="Healthcare Partners"
            title="A Courier Partner Built for Healthcare Organizations"
            description="Safeway Couriers understands that healthcare organizations need more than transportation. They need a courier partner with documented procedures, trained personnel, reliable communication, and accountability."
          />
        </Reveal>
        <p className="mt-6 max-w-3xl leading-relaxed text-mist-soft">
          Our operational standards are designed to support the expectations of hospitals,
          laboratories, pharmacies, physician offices, clinics, nursing facilities, and other
          healthcare organizations.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {partnerHighlights.map((item, index) => (
            <Reveal key={item} delay={index * 35}>
              <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-graphite px-4 py-3 text-sm font-medium text-mist">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-medical-bright" aria-hidden="true" />
                {item}
              </li>
            </Reveal>
          ))}
        </ul>
        <Link href="/quote?reason=compliance" className="mkt-btn mkt-btn-primary mt-10">
          Request Our Compliance Packet
        </Link>
      </Container>
    </section>
  );
}
