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
    <section id="services" className="section-anchor bg-ice py-20">
      <Container>
        {showHeading ? (
          <SectionHeading
            eyebrow="Services"
            title="Medical Courier Services Built Around Healthcare"
            description="From laboratory pickups to STAT runs, Safeway Couriers supports the daily movement of medical materials across Columbus and Central Ohio."
          />
        ) : null}
        <div className={`grid gap-5 md:grid-cols-2 lg:grid-cols-3 ${showHeading ? "mt-10" : ""}`}>
          {services.map((service) => {
            const Icon = icons[service.id];
            return (
              <article
                key={service.id}
                id={service.id}
                className="rounded-2xl border border-line bg-paper p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-medical/30 hover:shadow-md"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ice text-medical">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-navy">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{service.summary}</p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
