import { communities, industries, services } from "@/lib/site";
import { Container } from "@/components/Container";
import { CountUp } from "@/components/marketing/CountUp";
import { Reveal } from "@/components/marketing/Reveal";

const metrics = [
  {
    value: services.length,
    label: "Specialized medical services",
    detail: "Specimen, pharmacy, STAT, routes, and more",
  },
  {
    value: industries.length,
    label: "Healthcare settings served",
    detail: "Hospitals, labs, pharmacies, and clinics",
  },
  {
    value: communities.length,
    label: "Central Ohio communities",
    detail: "Coverage mapped around Columbus",
  },
  {
    value: 7,
    label: "Tracked delivery stages",
    detail: "Accept through confirmed delivery",
  },
] as const;

export function MetricsStrip() {
  return (
    <section className="border-y border-white/10 bg-charcoal">
      <Container className="grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        {metrics.map((metric, index) => (
          <Reveal key={metric.label} delay={index * 80}>
            <p className="text-5xl font-semibold tracking-tight text-mist sm:text-6xl">
              <CountUp value={metric.value} />
            </p>
            <p className="mt-3 text-sm font-semibold text-mist">{metric.label}</p>
            <p className="mt-1 text-xs text-mist-soft">{metric.detail}</p>
          </Reveal>
        ))}
      </Container>
    </section>
  );
}
