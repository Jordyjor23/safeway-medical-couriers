import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentLegalDocument } from "@/lib/settings";
import { getSetting } from "@/lib/settings";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Accessibility / Accommodation" };

export default async function AccessibilityPage() {
  const [doc, careers] = await Promise.all([
    getCurrentLegalDocument("accommodation"),
    getSetting("careers", { accommodationEmail: site.email }),
  ]);
  if (!doc) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title={doc.title}
        description="Request assistance or a reasonable accommodation during the application process."
      />
      <Container className="max-w-3xl space-y-5 whitespace-pre-wrap py-16 leading-relaxed text-mist-soft">
        <p>{doc.body}</p>
        <p>
          Contact:{" "}
          <a className="font-semibold text-medical" href={`mailto:${careers.accommodationEmail}`}>
            {careers.accommodationEmail}
          </a>
        </p>
      </Container>
    </>
  );
}
