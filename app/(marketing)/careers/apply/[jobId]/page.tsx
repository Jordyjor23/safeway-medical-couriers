import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicationForm } from "@/components/careers/ApplicationForm";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { getPublishedJobByPublicId } from "@/lib/jobs";
import { getCurrentLegalDocument, getSetting } from "@/lib/settings";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Apply" };

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await getPublishedJobByPublicId(jobId);
  if (!job) notFound();
  const [ack, careers] = await Promise.all([
    getCurrentLegalDocument("application-acknowledgement"),
    getSetting("careers", { accommodationEmail: site.email }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={job.workerClassification === "INDEPENDENT_CONTRACTOR" ? "Contractor application" : "Employment application"}
        title={`Apply: ${job.title}`}
        description="Submit only job-related information. This form does not collect Social Security numbers, date of birth, photographs, or salary history."
      />
      <Container className="py-16">
        <ApplicationForm
          job={{
            publicId: job.publicId,
            title: job.title,
            requiresDriversLicense: job.requiresDriversLicense,
            isMedicalCourier: job.category?.isMedicalCourier ?? false,
            workerClassification: job.workerClassification,
            questions: job.questions,
          }}
          acknowledgement={ack?.body ?? ""}
          privacyHref="/careers/privacy"
          accommodationEmail={careers.accommodationEmail}
        />
      </Container>
    </>
  );
}
