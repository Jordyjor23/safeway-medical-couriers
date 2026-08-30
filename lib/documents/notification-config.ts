import { getSetting } from "@/lib/settings";

export const DEFAULT_DOCUMENT_REMINDER_DAYS = [90, 60, 30, 14, 7, 1] as const;
export const DEFAULT_NEEDS_REVIEW_HOURS = [24, 72, 168] as const;

export type NotificationAudience = "employee" | "admin" | "reviewer";

export type EscalationRule = {
  threshold: number | "expired";
  audiences: NotificationAudience[];
};

export type DocumentNotificationSettings = {
  thresholdsDays: number[];
  includeExpired: boolean;
  employeeDirectReminders: boolean;
  adminEscalation: boolean;
  needsReviewHours: number[];
  escalation: EscalationRule[];
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
};

export const DEFAULT_DOCUMENT_NOTIFICATION_SETTINGS: DocumentNotificationSettings = {
  thresholdsDays: [...DEFAULT_DOCUMENT_REMINDER_DAYS],
  includeExpired: true,
  employeeDirectReminders: true,
  adminEscalation: true,
  needsReviewHours: [...DEFAULT_NEEDS_REVIEW_HOURS],
  escalation: [
    { threshold: 90, audiences: ["employee"] },
    { threshold: 60, audiences: ["employee"] },
    { threshold: 30, audiences: ["employee"] },
    { threshold: 14, audiences: ["employee"] },
    { threshold: 7, audiences: ["employee", "admin"] },
    { threshold: 1, audiences: ["employee", "admin"] },
    { threshold: "expired", audiences: ["employee", "admin"] },
  ],
  channels: {
    inApp: true,
    email: false,
    sms: false,
  },
};

export function documentEmailNotificationsEnabled() {
  const value = (process.env.DOCUMENT_EMAIL_NOTIFICATIONS ?? "").trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export function parseThresholdDays(raw: string | undefined, fallback: number[]) {
  const parsed = (raw ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  return parsed.length ? [...new Set(parsed)].sort((a, b) => b - a) : fallback;
}

function asAudience(value: unknown): NotificationAudience | null {
  if (value === "employee" || value === "admin" || value === "reviewer") return value;
  return null;
}

function normalizeEscalation(value: unknown, fallback: EscalationRule[]): EscalationRule[] {
  if (!Array.isArray(value)) return fallback;
  const rules: EscalationRule[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const thresholdRaw = "threshold" in entry ? entry.threshold : undefined;
    const threshold =
      thresholdRaw === "expired" ? "expired" : typeof thresholdRaw === "number" && thresholdRaw > 0 ? thresholdRaw : null;
    const audiences = Array.isArray((entry as { audiences?: unknown }).audiences)
      ? (entry as { audiences: unknown[] }).audiences.map(asAudience).filter((item): item is NotificationAudience => Boolean(item))
      : [];
    if (threshold != null && audiences.length) {
      rules.push({ threshold, audiences: [...new Set(audiences)] });
    }
  }
  return rules.length ? rules : fallback;
}

export function normalizeDocumentNotificationSettings(
  value: Partial<DocumentNotificationSettings> | null | undefined,
): DocumentNotificationSettings {
  const fallback = DEFAULT_DOCUMENT_NOTIFICATION_SETTINGS;
  const thresholdsDays = Array.isArray(value?.thresholdsDays)
    ? [...new Set(value.thresholdsDays.filter((day) => Number.isFinite(day) && day > 0))].sort((a, b) => b - a)
    : fallback.thresholdsDays;
  const needsReviewHours = Array.isArray(value?.needsReviewHours)
    ? [...new Set(value.needsReviewHours.filter((hour) => Number.isFinite(hour) && hour > 0))].sort((a, b) => a - b)
    : fallback.needsReviewHours;
  return {
    thresholdsDays: thresholdsDays.length ? thresholdsDays : fallback.thresholdsDays,
    includeExpired: value?.includeExpired !== false,
    employeeDirectReminders: value?.employeeDirectReminders !== false,
    adminEscalation: value?.adminEscalation !== false,
    needsReviewHours: needsReviewHours.length ? needsReviewHours : fallback.needsReviewHours,
    escalation: normalizeEscalation(value?.escalation, fallback.escalation),
    channels: {
      inApp: true,
      email: documentEmailNotificationsEnabled(),
      sms: false,
    },
  };
}

export async function getDocumentNotificationSettings() {
  const stored = await getSetting<Partial<DocumentNotificationSettings>>("documentNotifications", {});
  return normalizeDocumentNotificationSettings(stored);
}

export function audiencesForThreshold(
  settings: DocumentNotificationSettings,
  threshold: number | "expired",
  ruleOverride?: EscalationRule[] | null,
): NotificationAudience[] {
  const rules = ruleOverride?.length ? ruleOverride : settings.escalation;
  const match = rules.find((rule) => rule.threshold === threshold);
  const audiences = new Set<NotificationAudience>(match?.audiences ?? ["employee"]);
  if (!settings.employeeDirectReminders) audiences.delete("employee");
  if (!settings.adminEscalation) {
    audiences.delete("admin");
    audiences.delete("reviewer");
  }
  if (!audiences.size) audiences.add("employee");
  return [...audiences];
}
