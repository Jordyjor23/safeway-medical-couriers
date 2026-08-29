import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentLegalDocument } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Equal Employment Opportunity" };

export default async function EeoPage() {
  const doc = await getCurrentLegalDocument("eeo");
  if (!doc) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title={doc.title}
        description="Equal employment opportunity notice for applicants and team members."
      />
      <Container className="max-w-3xl whitespace-pre-wrap py-16 leading-relaxed text-mist-soft">
        {doc.body}
      </Container>
    </>
  );
}
