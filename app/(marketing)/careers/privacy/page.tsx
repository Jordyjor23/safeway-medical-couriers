import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentLegalDocument } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Applicant Privacy" };

export default async function ApplicantPrivacyPage() {
  const doc = await getCurrentLegalDocument("applicant-privacy");
  if (!doc) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title={doc.title}
        description="How Safeway Couriers handles information submitted in employment and contractor applications."
      />
      <Container className="max-w-3xl py-16 text-muted leading-relaxed whitespace-pre-wrap">
        {doc.body}
      </Container>
    </>
  );
}
