import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Application received" };

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ trackingNumber: string }>;
}) {
  const { trackingNumber } = await params;

  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title="Application Received"
        description="We have your application. Keep your reference number to check status."
      />
      <Container className="max-w-lg py-16">
        <div className="rounded-2xl border border-medical/40 bg-panel p-8">
          <p className="text-sm text-mist-soft">Reference number</p>
          <p className="font-semibold text-mist">{trackingNumber}</p>
          <p className="mt-6 text-sm text-mist-soft">
            A confirmation email is sent when email delivery is configured. For privacy, applicant
            details are not placed in this URL or displayed on this receipt page.
          </p>
          <Link href="/careers/status" className="mkt-btn mkt-btn-primary mt-6">
            Check application status
          </Link>
        </div>
      </Container>
    </>
  );
}
