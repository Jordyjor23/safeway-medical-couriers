import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${site.name}.`,
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="How Safeway Couriers handles information submitted through this website."
      />
      <Container className="max-w-3xl space-y-5 py-16 leading-relaxed text-mist-soft">
        <p>
          This website collects information you choose to submit through quote
          and contact forms, such as your name, organization, email, phone
          number, and delivery details. We use that information to respond to
          service inquiries and vendor onboarding requests.
        </p>
        <p>
          We do not sell personal information. Do not include protected health
          information in website forms. For contracted courier work, confidential
          healthcare information is handled under our operational privacy and
          information-security policies.
        </p>
        <p>
          Questions about this policy may be sent to{" "}
          <a href={`mailto:${site.email}`} className="font-semibold text-medical">
            {site.email}
          </a>
          , called at{" "}
          <a href={site.phoneHref} className="font-semibold text-medical">
            {site.phone}
          </a>
          , or mailed to {site.street}, {site.city}, {site.state} {site.zip}.
        </p>
      </Container>
    </>
  );
}
