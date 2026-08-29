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
import { Reveal } from "@/components/marketing/Reveal";
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
    <section id="industries" className="section-anchor bg-void py-24">
      <Container>
        <Reveal>
          <SectionHeading
            light
            eyebrow="Industries We Serve"
            title="Supporting Healthcare Across Central Ohio"
            description="Safeway Couriers works with the organizations that keep Columbus-area healthcare moving — from hospital campuses to neighborhood practices."
          />
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {industries.map((industry, index) => {
            const Icon = icons[industry.key];
            return (
              <Reveal key={industry.key} delay={index * 40}>
                <article className="h-full rounded-2xl border border-white/10 bg-graphite p-5 transition duration-200 hover:-translate-y-0.5 hover:border-medical/35">
                  <Icon className="h-5 w-5 text-medical-bright" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold text-mist">{industry.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-mist-soft">{industry.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
