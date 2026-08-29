import { HeartPulse, Headset, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Container } from "@/components/Container";
import { Reveal } from "@/components/marketing/Reveal";
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
    <section id="why-choose-us" className="section-anchor bg-charcoal py-24">
      <Container>
        <Reveal>
          <SectionHeading
            light
            eyebrow="Why Choose Us"
            title="Why Choose Safeway Couriers?"
            description="Safeway Couriers provides fast, reliable, and professional medical courier services with the attention to detail healthcare deliveries require. What sets us apart is our focus on timely service, secure handling, clear communication, and dependable delivery from pickup to drop-off."
          />
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {whyFeatures.map((feature, index) => {
            const Icon = icons[feature.key];
            return (
              <Reveal key={feature.key} delay={index * 70}>
                <article className="h-full rounded-2xl border border-white/10 bg-graphite p-6 transition duration-200 hover:border-medical/40">
                  <Icon className="h-6 w-6 text-medical-bright" aria-hidden="true" />
                  <h3 className="mt-4 text-xl font-semibold text-mist">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist-soft">{feature.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={120}>
          <p className="mt-12 rounded-2xl border border-white/10 bg-void px-6 py-7 text-lg font-medium text-mist sm:px-8">
            We don&apos;t simply move packages. We understand the urgency and responsibility behind
            every medical delivery.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
