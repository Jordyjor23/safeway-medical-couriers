export const WHY_WORK_ITEMS = [
  {
    title: "Growing healthcare logistics company",
    body: "Join a company focused on professional medical and time-sensitive courier work in Central Ohio.",
  },
  {
    title: "Medical courier opportunities",
    body: "Roles supporting healthcare organizations with specimens, medications, supplies, and documents.",
  },
  {
    title: "Scheduled and on-demand routes",
    body: "Work may include recurring routes, on-demand assignments, or a mix depending on the position.",
  },
  {
    title: "Flexible scheduling depending on role",
    body: "Availability needs vary by opening. Posted jobs describe the schedule for that role.",
  },
  {
    title: "Professional development",
    body: "Opportunities to build healthcare-logistics skills as the company grows.",
  },
  {
    title: "Specialized courier training",
    body: "Safeway Couriers may require company-specific training before assignment, even if you already have related certificates.",
  },
  {
    title: "Advancement opportunities",
    body: "Openings may include courier, dispatch, operations, compliance, sales, and technology paths.",
  },
  {
    title: "Technology-enabled dispatch and delivery management",
    body: "Team members use GPS and mobile tools as required by the role.",
  },
  {
    title: "Safety-focused work environment",
    body: "Procedures emphasize careful handling, privacy, and incident response.",
  },
  {
    title: "Equal employment opportunity",
    body: "Safeway Couriers provides equal employment opportunities and does not unlawfully discriminate under applicable law.",
  },
] as const;

export const PUBLIC_APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW_REQUESTED",
  "INTERVIEW_SCHEDULED",
  "CONDITIONAL_OFFER",
  "BACKGROUND_SCREENING",
  "ONBOARDING",
  "HIRED",
  "POSITION_FILLED",
  "WITHDRAWN",
  "NOT_SELECTED",
] as const;

export const PUBLIC_STATUS_LABELS: Record<(typeof PUBLIC_APPLICATION_STATUSES)[number], string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  INTERVIEW_REQUESTED: "Interview Requested",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  CONDITIONAL_OFFER: "Conditional Offer",
  BACKGROUND_SCREENING: "Background Screening",
  ONBOARDING: "Onboarding",
  HIRED: "Hired",
  POSITION_FILLED: "Position Filled",
  WITHDRAWN: "Withdrawn",
  NOT_SELECTED: "Not Selected",
};

export function publicStatusLabel(status: string) {
  if (status === "DRAFT") return "Not submitted";
  if (status in PUBLIC_STATUS_LABELS) {
    return PUBLIC_STATUS_LABELS[status as keyof typeof PUBLIC_STATUS_LABELS];
  }
  return "Under Review";
}
