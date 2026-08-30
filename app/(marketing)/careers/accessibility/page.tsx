import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { getPublishedLegalDocument, getSetting } from "@/lib/settings";
import { site, publishedContactEmail } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Accessibility / Accommodation" };

export default async function AccessibilityPage() {
  const [doc, careers] = await Promise.all([
    getPublishedLegalDocument("accommodation"),
    getSetting("careers", { accommodationEmail: site.email }),
  ]);
  const contactEmail = publishedContactEmail(careers.accommodationEmail);
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title={doc?.title ?? "Accessibility / Accommodation"}
        description="Request assistance or a reasonable accommodation during the application process."
      />
      <Container className="max-w-3xl space-y-5 py-16 leading-relaxed text-mist-soft">
        <div className="whitespace-pre-wrap">{doc?.body}</div>
        <p>
          Contact:{" "}
          <a className="font-semibold text-medical" href={`mailto:${contactEmail}`}>
            {contactEmail}
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
