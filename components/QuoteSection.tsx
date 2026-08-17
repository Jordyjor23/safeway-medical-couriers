import { Container } from "@/components/Container";
import { QuoteForm } from "@/components/QuoteForm";
import { SectionHeading } from "@/components/SectionHeading";

export function QuoteSection() {
  return (
    <section id="quote" className="section-anchor bg-paper py-20">
      <Container className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeading
          eyebrow="Request a Quote"
          title="Tell us what your organization needs moved."
          description="Share your facilities, timing, and service type. Use this same form to request a compliance packet for vendor onboarding."
        />
        <QuoteForm />
      </Container>
    </section>
  );
}
