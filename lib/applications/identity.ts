const CLOSED_APPLICATION_STATUSES = new Set([
  "WITHDRAWN",
  "NOT_SELECTED",
  "REJECTED",
  "POSITION_FILLED",
]);

const ACTIVE_APPLICATION_STATUSES = new Set([
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
]);

export const PUBLIC_APPLY_REQUIRES_LOGIN =
  "An account already exists for this email. Sign in to apply, save drafts, or check your application status.";

export type ApplicationWriteDecision =
  | { action: "refuse_login_required"; message: string }
  | { action: "create" }
  | { action: "create_draft" }
  | { action: "update_draft"; applicationId: string }
  | { action: "submit_draft"; applicationId: string }
  | { action: "reuse"; applicationId: string };

export function applicantAccountAlreadyLinked(applicant: { userId?: string | null } | null | undefined) {
  return Boolean(applicant?.userId);
}

export function applicantLinkConflicts(existing: { userId?: string | null } | null | undefined, userId: string) {
  return Boolean(existing?.userId && existing.userId !== userId);
}

export function shouldGrantApplicantRole(user: {
  roles: string[];
  employeeId?: string | null;
}) {
  if (user.employeeId) return false;
  if (user.roles.includes("EMPLOYEE") || user.roles.includes("DRIVER")) return false;
  return !user.roles.includes("APPLICANT");
}

export function isClosedApplicationStatus(status: string) {
  return CLOSED_APPLICATION_STATUSES.has(status);
}

export function isActiveApplicationStatus(status: string) {
  return ACTIVE_APPLICATION_STATUSES.has(status);
}

export function decideApplicationWrite(args: {
  mode: "public" | "authenticated";
  applicantUserId?: string | null;
  existingForJob?: { id: string; status: string } | null;
}): ApplicationWriteDecision {
  if (args.mode === "public" && applicantAccountAlreadyLinked({ userId: args.applicantUserId })) {
    return { action: "refuse_login_required", message: PUBLIC_APPLY_REQUIRES_LOGIN };
  }
  if (!args.existingForJob) {
    return { action: args.mode === "authenticated" ? "create" : "create" };
  }
  if (args.existingForJob.status === "DRAFT") {
    return { action: "submit_draft", applicationId: args.existingForJob.id };
  }
  if (isActiveApplicationStatus(args.existingForJob.status)) {
    return { action: "reuse", applicationId: args.existingForJob.id };
  }
  return { action: "create" };
}

export function decideDraftWrite(existingForJob?: { id: string; status: string } | null): ApplicationWriteDecision {
  if (!existingForJob) return { action: "create_draft" };
  if (existingForJob.status === "DRAFT") {
    return { action: "update_draft", applicationId: existingForJob.id };
  }
  if (isActiveApplicationStatus(existingForJob.status)) {
    return { action: "reuse", applicationId: existingForJob.id };
  }
  return { action: "create_draft" };
}
