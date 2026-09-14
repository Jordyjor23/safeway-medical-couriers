import type { ApplicationStatus } from "@prisma/client";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW_REQUESTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW",
  "CONDITIONAL_OFFER",
  "DOCUMENTS_REQUIRED",
  "BACKGROUND_SCREENING",
  "COMPLIANCE_REVIEW",
  "ONBOARDING",
  "HIRED",
  "POSITION_FILLED",
  "WITHDRAWN",
  "NOT_SELECTED",
  "REJECTED",
];

export const APPLICANT_VISIBLE_STATUSES: ApplicationStatus[] = APPLICATION_STATUSES.filter(
  (status) => status !== "DRAFT",
);

export const STAFF_PIPELINE_STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW_REQUESTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW",
  "CONDITIONAL_OFFER",
  "DOCUMENTS_REQUIRED",
  "BACKGROUND_SCREENING",
  "COMPLIANCE_REVIEW",
  "ONBOARDING",
  "HIRED",
  "POSITION_FILLED",
  "WITHDRAWN",
  "NOT_SELECTED",
  "REJECTED",
];

const APPLICANT_SAFE_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Not submitted",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  INTERVIEW_REQUESTED: "Interview requested",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  INTERVIEW: "Interview",
  CONDITIONAL_OFFER: "Conditional offer",
  DOCUMENTS_REQUIRED: "Documents required",
  BACKGROUND_SCREENING: "Background screening",
  COMPLIANCE_REVIEW: "Compliance review",
  ONBOARDING: "Onboarding",
  HIRED: "Hired",
  POSITION_FILLED: "Position filled",
  WITHDRAWN: "Withdrawn",
  NOT_SELECTED: "Not selected",
  REJECTED: "Not selected",
};

export function applicantSafeStatusLabel(status: string) {
  if (status in APPLICANT_SAFE_LABELS) {
    return APPLICANT_SAFE_LABELS[status as ApplicationStatus];
  }
  return "Under review";
}

export function isTerminalApplicationStatus(status: ApplicationStatus) {
  return status === "HIRED" || status === "WITHDRAWN" || status === "NOT_SELECTED" || status === "REJECTED" || status === "POSITION_FILLED";
}

export function applicantCanEditApplication(status: ApplicationStatus) {
  return status === "DRAFT" || status === "DOCUMENTS_REQUIRED";
}

export function applicantCanSubmitApplication(status: ApplicationStatus) {
  return status === "DRAFT";
}

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as string[]).includes(value);
}
