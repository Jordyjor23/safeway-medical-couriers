import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { QuoteForm } from "@/components/QuoteForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Request a Quote",
  description: `Request medical courier service or a compliance packet from ${site.name} in Columbus, Ohio.`,
};

export default function QuotePage() {
  return (
    <>
      <PageHeader
        eyebrow="Request a Quote"
        title="Request medical courier service or a compliance packet."
        description="Tell us about your organization, pickup and delivery cities, and whether you need a quote or vendor onboarding materials."
      />
      <Container className="py-16">
        <QuoteForm />
      </Container>
    </>
  );
}
