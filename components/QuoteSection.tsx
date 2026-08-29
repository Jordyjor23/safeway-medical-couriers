import { Container } from "@/components/Container";
import { QuoteForm } from "@/components/QuoteForm";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

export function QuoteSection() {
  return (
    <section id="quote" className="section-anchor bg-void py-24">
      <Container className="mkt-split-quote grid items-start gap-10 lg:grid-cols-2">
        <Reveal>
          <SectionHeading
            light
            eyebrow="Request a Quote"
            title="Tell us what your organization needs moved."
            description="Share your facilities, timing, and service type. Use this same form to request a compliance packet for vendor onboarding."
          />
        </Reveal>
        <Reveal delay={80}>
          <QuoteForm />
        </Reveal>
      </Container>
    </section>
  );
}
