import { createHash } from "node:crypto";
import { appOrigin } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { createActivationToken } from "@/lib/ids";
import { applicantOnboardingDocumentRequirements } from "@/lib/onboarding-documents";

const PREFIX = "candidate-onboarding:";
export const CANDIDATE_ONBOARDING_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function identifier(token: string) {
  return PREFIX + hashToken(token);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

export async function revokeCandidateOnboardingLinks(applicationId: string) {
  await prisma.verification.deleteMany({
    where: { value: applicationId, identifier: { startsWith: PREFIX } },
  });
}

export async function issueCandidateOnboardingLink(args: {
  applicationId: string;
  email: string;
  name: string;
}) {
  await revokeCandidateOnboardingLinks(args.applicationId);
  const token = createActivationToken();
  const expiresAt = new Date(Date.now() + CANDIDATE_ONBOARDING_TTL_MS);
  await prisma.verification.create({
    data: {
      identifier: identifier(token),
      value: args.applicationId,
      expiresAt,
    },
  });

  const application = await prisma.application.findUnique({
    where: { id: args.applicationId },
    include: { jobOpening: true },
  });
  const requirements = application
    ? applicantOnboardingDocumentRequirements({
        workerClassification: application.jobOpening.workerClassification,
        requiresDriving: application.jobOpening.requiresDriversLicense,
      })
    : [];

  const url = new URL("/careers/onboarding/" + token, appOrigin()).toString();
  const checklistHtml = requirements.length
    ? "<p><strong>Documents requested:</strong></p><ul>" +
      requirements.map((item) => "<li>" + escapeHtml(item.label) + "</li>").join("") +
      "</ul>"
    : "";
  try {
    const result = await sendTransactionalEmail({
      to: args.email,
      subject: "Conditional offer: upload your Safeway Couriers documents",
      html:
        "<p>Hello " + escapeHtml(args.name) + ",</p>" +
        "<p>Safeway Couriers is ready for the next step. Please upload the required documents for review.</p>" +
        checklistHtml +
        '<p><a href="' + url + '">Open your secure document checklist and upload page</a></p>' +
        "<p>This private link expires in 14 days. Do not forward it to anyone.</p>" +
        "<p>Uploaded documents are reviewed before they are considered verified.</p>",
    });
    return { emailSent: Boolean(result?.id), expiresAt };
  } catch {
    return { emailSent: false as const, expiresAt };
  }
}

export async function resolveCandidateOnboardingToken(token: string) {
  const value = token.trim();
  if (!value) return null;
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: identifier(value),
      expiresAt: { gt: new Date() },
    },
  });
  if (!verification) return null;

  const application = await prisma.application.findUnique({
    where: { id: verification.value },
    include: {
      applicant: true,
      jobOpening: true,
      documents: {
        include: { document: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!application) return null;
  if (!["CONDITIONAL_OFFER", "BACKGROUND_SCREENING", "ONBOARDING"].includes(application.status)) {
    return null;
  }
  return { verification, application };
}
