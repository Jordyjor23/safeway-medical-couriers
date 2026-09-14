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
        description="We have your application. Create an account or sign in to view status, drafts, and documents."
      />
      <Container className="max-w-lg py-16">
        <div className="rounded-2xl border border-medical/40 bg-panel p-8">
          <p className="text-sm text-mist-soft">Reference number</p>
          <p className="font-semibold text-mist">{trackingNumber}</p>
          <p className="mt-6 text-sm text-mist-soft">
            Keep this reference for your records. Application status is no longer available from a
            public lookup. Sign in to the applicant portal to see updates and upload documents.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?next=/applicant/dashboard" className="mkt-btn mkt-btn-primary">
              Sign in to view status
            </Link>
            <Link href="/register" className="mkt-btn">
              Create an account
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
