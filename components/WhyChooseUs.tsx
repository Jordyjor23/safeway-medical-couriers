import { HeartPulse, Headset, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { whyFeatures } from "@/lib/site";

const icons = {
  dependable: ShieldCheck,
  responsive: Headset,
  healthcare: HeartPulse,
  flexible: SlidersHorizontal,
};

export function WhyChooseUs() {
  return (
    <section id="why-choose-us" className="section-anchor bg-paper py-20">
      <Container>
        <SectionHeading
          eyebrow="Why Choose Us"
          title="Why Choose Safeway Couriers?"
          description="Safeway Couriers provides fast, reliable, and professional medical courier services with the attention to detail healthcare deliveries require. What sets us apart is our focus on timely service, secure handling, clear communication, and dependable delivery from pickup to drop-off."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {whyFeatures.map((feature) => {
            const Icon = icons[feature.key];
            return (
              <article
                key={feature.key}
                className="rounded-2xl border border-line bg-ice p-6 transition duration-200 hover:border-medical/30"
              >
                <Icon className="h-6 w-6 text-medical" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-semibold text-navy">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
              </article>
            );
          })}
        </div>
        <p className="mt-10 rounded-2xl bg-navy px-6 py-6 text-lg font-medium text-white sm:px-8">
          We don&apos;t simply move packages. We understand the urgency and
          responsibility behind every medical delivery.
        </p>
      </Container>
    </section>
  );
}
