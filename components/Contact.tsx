import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/Container";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { addressLines, site } from "@/lib/site";

export function Contact({ showHeading = true }: { showHeading?: boolean }) {
  return (
    <section id="contact" className="section-anchor bg-graphite py-24">
      <Container>
        {showHeading ? (
          <Reveal>
            <SectionHeading
              light
              eyebrow="Contact"
              title="Talk with Safeway Couriers"
              description="Reach our Columbus office for quotes, routing questions, or vendor onboarding."
            />
          </Reveal>
        ) : null}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: MapPin,
              label: site.name,
              body: (
                <>
                  {addressLines[0]}
                  <br />
                  {addressLines[1]}
                </>
              ),
            },
            { icon: Phone, kicker: "Phone", label: site.phone },
            { icon: Mail, kicker: "Email", label: site.email },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.label} delay={index * 70}>
                <div className="rounded-2xl border border-white/10 bg-panel p-6">
                  <Icon className="h-5 w-5 text-medical-bright" aria-hidden="true" />
                  {"kicker" in item && item.kicker ? (
                    <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-medical-bright">
                      {item.kicker}
                    </p>
                  ) : null}
                  <p className="mt-4 text-lg font-semibold text-mist">{item.label}</p>
                  {"body" in item ? (
                    <p className="mt-2 text-sm leading-relaxed text-mist-soft">{item.body}</p>
                  ) : null}
                </div>
              </Reveal>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/quote" className="mkt-btn mkt-btn-primary">
            Request a Quote
          </Link>
          <Link href="/contact" className="mkt-btn mkt-btn-secondary">
            Contact Us
          </Link>
        </div>
      </Container>
    </section>
  );
}
