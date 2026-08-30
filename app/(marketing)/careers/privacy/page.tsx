import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { getPublishedLegalDocument } from "@/lib/settings";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Applicant Privacy" };

export default async function ApplicantPrivacyPage() {
  const doc = await getPublishedLegalDocument("applicant-privacy");
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title={doc?.title ?? "Applicant Privacy"}
        description="How Safeway Couriers handles information submitted in employment and contractor applications."
      />
      <Container className="max-w-3xl space-y-5 py-16 leading-relaxed text-mist-soft">
        <div className="whitespace-pre-wrap">{doc?.body}</div>
        <p>
          Questions:{" "}
          <a className="font-semibold text-medical" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          {" · "}
          <a className="font-semibold text-medical" href={site.phoneHref}>
            {site.phone}
          </a>
        </p>
      </Container>
    </>
  );
}
