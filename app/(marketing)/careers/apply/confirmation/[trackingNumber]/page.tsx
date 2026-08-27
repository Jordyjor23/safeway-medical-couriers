import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { publicStatusLabel } from "@/lib/careers-content";
import { prisma } from "@/lib/db";
import { publicApplicationView } from "@/lib/application-schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Application received" };

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ trackingNumber: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { trackingNumber } = await params;
  const { email } = await searchParams;
  if (!email) notFound();

  const application = await prisma.application.findFirst({
    where: {
      trackingNumber,
      applicant: { email: email.toLowerCase() },
      status: { not: "DRAFT" },
    },
    include: { applicant: true, jobOpening: true },
  });
  if (!application) notFound();

  const view = publicApplicationView(application);

  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title="Application Received"
        description="We have your application. Keep your reference number to check status."
      />
      <Container className="max-w-lg py-16">
        <div className="rounded-2xl border border-medical/30 bg-paper p-8">
          <p className="text-sm text-muted">Applicant</p>
          <p className="font-semibold text-navy">{view.applicantName}</p>
          <p className="mt-4 text-sm text-muted">Position</p>
          <p className="font-semibold text-navy">{view.position}</p>
          <p className="mt-4 text-sm text-muted">Reference number</p>
          <p className="font-semibold text-navy">{view.trackingNumber}</p>
          <p className="mt-4 text-sm text-muted">Submitted</p>
          <p className="font-semibold text-navy">
            {view.submittedAt ? view.submittedAt.toLocaleString() : "—"}
          </p>
          <p className="mt-4 text-sm text-muted">Current status</p>
          <p className="font-semibold text-navy">{publicStatusLabel(view.status)}</p>
          <p className="mt-6 text-sm text-muted">
            A confirmation email is sent when email delivery is configured. You can also check
            status anytime.
          </p>
          <Link
            href="/careers/status"
            className="mt-6 inline-flex rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-medical"
          >
            Check application status
          </Link>
        </div>
      </Container>
    </>
  );
}
