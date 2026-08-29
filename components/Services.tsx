import {
  Clock,
  FileText,
  FlaskConical,
  Microscope,
  Package,
  Pill,
  Route,
} from "lucide-react";
import { Container } from "@/components/Container";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { services } from "@/lib/site";

const icons = {
  specimens: FlaskConical,
  "lab-pickups": Microscope,
  pharmacy: Pill,
  supplies: Package,
  routes: Route,
  stat: Clock,
  documents: FileText,
};

export function Services({ showHeading = true }: { showHeading?: boolean }) {
  return (
    <section id="services" className="section-anchor bg-void py-24">
      <Container>
        {showHeading ? (
          <Reveal>
            <SectionHeading
              light
              eyebrow="Services"
              title="Medical Courier Services Built Around Healthcare"
              description="From laboratory pickups to STAT runs, Safeway Couriers supports the daily movement of medical materials across Columbus and Central Ohio."
            />
          </Reveal>
        ) : null}
        <div className={`grid gap-5 md:grid-cols-2 lg:grid-cols-3 ${showHeading ? "mt-12" : ""}`}>
          {services.map((service, index) => {
            const Icon = icons[service.id];
            return (
              <Reveal key={service.id} delay={index * 55}>
                <article
                  id={service.id}
                  className="group h-full rounded-2xl border border-white/10 bg-graphite p-6 transition duration-200 hover:-translate-y-1 hover:border-medical/45 hover:shadow-[0_20px_50px_-28px_rgba(26,111,181,0.65)]"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-medical/25 bg-medical/10 text-medical-bright transition duration-200 group-hover:-translate-y-0.5">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-mist">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist-soft">{service.summary}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
