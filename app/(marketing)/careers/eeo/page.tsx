import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { getPublishedLegalDocument } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Equal Employment Opportunity" };

export default async function EeoPage() {
  const doc = await getPublishedLegalDocument("eeo");
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title={doc?.title ?? "Equal Employment Opportunity"}
        description="Equal employment opportunity notice for applicants and team members."
      />
      <Container className="max-w-3xl whitespace-pre-wrap py-16 leading-relaxed text-mist-soft">
        {doc?.body}
      </Container>
    </>
  );
}
