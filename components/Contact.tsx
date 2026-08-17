import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { addressLines, site } from "@/lib/site";

export function Contact() {
  return (
    <section id="contact" className="section-anchor bg-ice py-20">
      <Container>
        <SectionHeading
          eyebrow="Contact"
          title="Talk with Safeway Couriers"
          description="Reach our Columbus office for quotes, routing questions, or vendor onboarding."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-paper p-6">
            <MapPin className="h-5 w-5 text-medical" aria-hidden="true" />
            <p className="mt-4 text-lg font-semibold text-navy">{site.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {addressLines[0]}
              <br />
              {addressLines[1]}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-6">
            <Phone className="h-5 w-5 text-medical" aria-hidden="true" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-medical">
              Phone
            </p>
            <p className="mt-2 text-lg font-semibold text-navy">{site.phone}</p>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-6">
            <Mail className="h-5 w-5 text-medical" aria-hidden="true" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-medical">
              Email
            </p>
            <p className="mt-2 text-lg font-semibold text-navy">{site.email}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/quote"
            className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-medical"
          >
            Request a Quote
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-navy/15 bg-paper px-5 py-3 text-sm font-semibold text-navy hover:border-medical hover:text-medical"
          >
            Contact Us
          </Link>
        </div>
      </Container>
    </section>
  );
}
