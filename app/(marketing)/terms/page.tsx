import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service for ${site.name}.`,
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        description="Website terms for visitors and prospective clients of Safeway Couriers."
      />
      <Container className="max-w-3xl space-y-5 py-16 leading-relaxed text-mist-soft">
        <p>
          This website provides general information about medical courier
          services offered by {site.name} in Columbus and Central Ohio. Submitting
          a quote request does not create a service contract until both parties
          agree in writing.
        </p>
        <p>
          Service descriptions on this site are informational. Actual routes,
          timing, and handling requirements are confirmed during onboarding and
          in client-specific procedures.
        </p>
        <p>
          {site.name} is located at {site.street}, {site.city}, {site.state} {site.zip}. Contact{" "}
          <a href={site.phoneHref} className="font-semibold text-medical">
            {site.phone}
          </a>{" "}
          or{" "}
          <a href={`mailto:${site.email}`} className="font-semibold text-medical">
            {site.email}
          </a>
          .
        </p>
      </Container>
    </>
  );
}
