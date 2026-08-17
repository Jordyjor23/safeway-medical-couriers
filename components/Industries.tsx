import {
  Building2,
  Cross,
  FlaskConical,
  Hospital,
  Pill,
  Stethoscope,
  Store,
  Syringe,
  Truck,
  Users,
} from "lucide-react";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { industries } from "@/lib/site";

const icons = {
  hospitals: Hospital,
  labs: FlaskConical,
  pharmacies: Pill,
  physicians: Stethoscope,
  "urgent-care": Cross,
  dental: Syringe,
  nursing: Users,
  supply: Truck,
  specialty: Building2,
  "healthcare-orgs": Store,
};

export function Industries() {
  return (
    <section id="industries" className="section-anchor bg-ice py-20">
      <Container>
        <SectionHeading
          eyebrow="Industries We Serve"
          title="Supporting Healthcare Across Central Ohio"
          description="Safeway Couriers works with the organizations that keep Columbus-area healthcare moving — from hospital campuses to neighborhood practices."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {industries.map((industry) => {
            const Icon = icons[industry.key];
            return (
              <article
                key={industry.key}
                className="rounded-2xl border border-line bg-paper p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <Icon className="h-5 w-5 text-medical" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold text-navy">{industry.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">{industry.body}</p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
