import type { NotificationType } from "@prisma/client";

export const DOCUMENT_NOTIFICATION_TYPES: NotificationType[] = [
  "DOCUMENT_EXPIRING",
  "DOCUMENT_EXPIRED",
  "REQUIRED_DOCUMENT_MISSING",
  "DOCUMENT_REJECTED",
  "DOCUMENT_NEEDS_REVIEW",
  "COMPLIANCE_ACTION_REQUIRED",
  "COMPLIANCE_NON_COMPLIANT",
];

export function calendarDaysUntil(target: Date, now: Date) {
  const end = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((end - start) / 86_400_000);
}

export function hoursSince(from: Date, now: Date) {
  return (now.getTime() - from.getTime()) / 3_600_000;
}

/** Active window for a threshold so 30-day fires once, then 14-day later — not every cron tick. */
export function activeExpirationThreshold(daysRemaining: number, thresholds: readonly number[]) {
  const sorted = [...thresholds].filter((day) => day > 0).sort((a, b) => b - a);
  if (daysRemaining <= 0) return null;
  for (let index = 0; index < sorted.length; index += 1) {
    const threshold = sorted[index];
    const nextLower = sorted[index + 1] ?? 0;
    if (daysRemaining <= threshold && daysRemaining > nextLower) return threshold;
  }
  return null;
}

export function needsReviewAgeKey(ageHours: number, buckets: readonly number[]) {
  const sorted = [...buckets].filter((hour) => hour > 0).sort((a, b) => a - b);
  let matched: number | null = null;
  for (const bucket of sorted) {
    if (ageHours >= bucket) matched = bucket;
  }
  return matched;
}

export function documentNotificationDedupeKey(args: {
  documentId?: string | null;
  requirementId?: string | null;
  employeeId?: string | null;
  recipientId: string;
  type: NotificationType;
  thresholdKey: string;
}) {
  const subject = args.documentId
    ? `doc:${args.documentId}`
    : `req:${args.requirementId ?? "none"}:emp:${args.employeeId ?? "none"}`;
  return `${subject}:user:${args.recipientId}:type:${args.type}:threshold:${args.thresholdKey}`;
}

export function thresholdKeyForDays(days: number | "expired") {
  return days === "expired" ? "expired" : `${days}d`;
}

export function reviewAgeThresholdKey(hours: number) {
  return `${hours}h`;
}
