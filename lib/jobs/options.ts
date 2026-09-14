export const JOB_STATUSES = ["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "ARCHIVED"] as const;

export const JOB_EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "TEMPORARY", "SEASONAL"] as const;

export const JOB_WORKER_CLASSIFICATIONS = ["EMPLOYEE", "INDEPENDENT_CONTRACTOR"] as const;

export const JOB_WORK_ARRANGEMENTS = ["ONSITE", "HYBRID", "REMOTE"] as const;

export const JOB_PAY_TYPES = ["HOURLY", "SALARY", "ROUTE_BASED", "COMMISSION"] as const;

export const JOB_DEPARTMENTS = [
  "Operations",
  "Dispatch",
  "Compliance",
  "Human Resources",
  "Sales",
  "Administration",
  "Customer Support",
  "Technology",
] as const;

export const JOB_SHIFTS = ["Day", "Evening", "Overnight", "Weekend", "Rotating", "On-call / STAT"] as const;

export function jobIsPubliclyVisible(status: string) {
  return status === "PUBLISHED";
}

export function jobOptionListsArePopulated() {
  return (
    JOB_STATUSES.length > 0 &&
    JOB_EMPLOYMENT_TYPES.length > 0 &&
    JOB_WORKER_CLASSIFICATIONS.length > 0 &&
    JOB_WORK_ARRANGEMENTS.length > 0 &&
    JOB_PAY_TYPES.length > 0 &&
    JOB_DEPARTMENTS.length > 0 &&
    JOB_SHIFTS.length > 0
  );
}

export function parseJobQuestions(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((prompt, sortOrder) => ({ prompt, required: true, sortOrder }));
}
