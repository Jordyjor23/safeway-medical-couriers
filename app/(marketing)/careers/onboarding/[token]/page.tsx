import type { Metadata } from "next";
import { CandidateOnboardingUploader } from "@/components/careers/CandidateOnboardingUploader";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { resolveCandidateOnboardingToken } from "@/lib/candidate-onboarding";
import {
  applicantOnboardingDocumentRequirements,
  applicantOnboardingDocumentTypes,
} from "@/lib/onboarding-documents";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Candidate onboarding" };

export default async function CandidateOnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveCandidateOnboardingToken(token);

  if (!resolved) {
    return (
      <>
        <PageHeader
          eyebrow="Careers"
          title="Onboarding link unavailable"
          description="This private onboarding link is invalid, expired, or no longer active."
        />
        <Container className="max-w-2xl py-16">
          <div className="rounded-2xl border border-white/10 bg-panel p-6 text-sm text-mist-soft">
            Contact Safeway Couriers if you need a new onboarding link.
          </div>
        </Container>
      </>
    );
  }

  const { application } = resolved;
  const allowedTypes = applicantOnboardingDocumentTypes({
    workerClassification: application.jobOpening.workerClassification,
    requiresDriving: application.jobOpening.requiresDriversLicense,
  });
  const requirements = applicantOnboardingDocumentRequirements({
    workerClassification: application.jobOpening.workerClassification,
    requiresDriving: application.jobOpening.requiresDriversLicense,
  });

  return (
    <>
      <PageHeader
        eyebrow="Secure onboarding"
        title={"Welcome, " + (application.applicant.preferredName || application.applicant.legalFirstName)}
        description={"Upload requested onboarding documents for " + application.jobOpening.title + "."}
      />
      <Container className="max-w-3xl py-16">
        <div className="mb-6 rounded-2xl border border-medical/30 bg-panel p-5 text-sm text-mist-soft">
          <p>
            Reference: <span className="font-semibold text-mist">{application.trackingNumber}</span>
          </p>
          <p className="mt-1">
            Status: <span className="font-semibold text-mist">{application.status.replaceAll("_", " ")}</span>
          </p>
          <p className="mt-3">
            This page is private. Do not forward the link. Submitted files are reviewed before they are accepted.
          </p>
        </div>

        <CandidateOnboardingUploader
          token={token}
          allowedTypes={allowedTypes}
          requirements={requirements}
          documents={application.documents.map(({ document }) => ({
            id: document.id,
            name: document.name,
            documentType: document.documentType,
            lifecycleStatus: document.lifecycleStatus,
            verificationStatus: document.verificationStatus,
            rejectionReason: document.rejectionReason,
          }))}
        />
      </Container>
    </>
  );
}
