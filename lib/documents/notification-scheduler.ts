import type { NotificationType } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { appOrigin } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { EmailDeliveryError, sendTransactionalEmail } from "@/lib/email";
import { isActiveDocument } from "@/lib/documents/lifecycle";
import {
  audiencesForThreshold,
  documentEmailNotificationsEnabled,
  getDocumentNotificationSettings,
  type DocumentNotificationSettings,
  type EscalationRule,
  type NotificationAudience,
} from "@/lib/documents/notification-config";
import {
  documentNotificationCopy,
  documentNotificationEmailHtml,
  portalHrefForRecipient,
} from "@/lib/documents/notification-copy";
import {
  activeExpirationThreshold,
  calendarDaysUntil,
  documentNotificationDedupeKey,
  hoursSince,
  needsReviewAgeKey,
  reviewAgeThresholdKey,
  thresholdKeyForDays,
} from "@/lib/documents/notification-keys";
import {
  filterRecipientsForType,
  isAdminAudience,
  isReviewerAudience,
  uniqueRecipients,
  type RecipientUser,
} from "@/lib/documents/notification-recipients";
import { documentSatisfiesRequirement, requirementAppliesToEmployee } from "@/lib/documents/qualifying-document";

type SendEmail = typeof sendTransactionalEmail;

type SchedulerDeps = {
  now?: Date;
  sendEmail?: SendEmail;
  emailEnabled?: boolean;
};

type SchedulerCounts = {
  evaluated: number;
  created: number;
  skippedDuplicate: number;
  emailAttempted: number;
  emailSent: number;
  emailFailed: number;
  emailSuppressed: number;
  escalations: number;
  emailRetried: number;
};

const DOCUMENT_SELECT = {
  id: true,
  name: true,
  documentType: true,
  expirationDate: true,
  lifecycleStatus: true,
  verificationStatus: true,
  suggestedTypeStatus: true,
  archivedAt: true,
  uploadedBy: true,
  extractionCompletedAt: true,
  createdAt: true,
  employeeLinks: { select: { employeeId: true, employee: { select: { id: true, userId: true, isDriver: true } } } },
  customerLinks: { select: { customerId: true } },
  contractLinks: { select: { contract: { select: { customerId: true } } } },
  deliveryLinks: { select: { delivery: { select: { customerId: true, driverEmployeeId: true } } } },
} as const;

function emptyCounts(): SchedulerCounts {
  return {
    evaluated: 0,
    created: 0,
    skippedDuplicate: 0,
    emailAttempted: 0,
    emailSent: 0,
    emailFailed: 0,
    emailSuppressed: 0,
    escalations: 0,
    emailRetried: 0,
  };
}

export async function runDocumentNotificationScheduler(deps: SchedulerDeps = {}) {
  const now = deps.now ?? new Date();
  const sendEmail = deps.sendEmail ?? sendTransactionalEmail;
  const emailEnabled = deps.emailEnabled ?? documentEmailNotificationsEnabled();
  const settings = await getDocumentNotificationSettings();
  const counts = emptyCounts();
  const directory = await loadRecipientDirectory();

  await retryFailedDocumentEmails({ sendEmail, emailEnabled, counts });
  await processExpirationReminders({ now, settings, directory, sendEmail, emailEnabled, counts });
  await processMissingRequirements({ now, settings, directory, sendEmail, emailEnabled, counts });
  await processNeedsReviewReminders({ now, settings, directory, sendEmail, emailEnabled, counts });

  await writeAuditLog({
    action: "document.notification.evaluated",
    targetType: "document-notification",
    metadata: { ...counts, emailEnabled, smsEnabled: false },
  });

  return counts;
}

async function loadRecipientDirectory() {
  const rows = await prisma.userRole.findMany({
    where: { user: { disabled: false, accountStatus: "ACTIVE" } },
    select: {
      role: { select: { key: true } },
      user: {
        select: {
          id: true,
          email: true,
          disabled: true,
          employee: { select: { id: true } },
          customerUser: { select: { customerId: true } },
        },
      },
    },
  });
  const byId = new Map<string, RecipientUser>();
  for (const row of rows) {
    const existing = byId.get(row.user.id);
    const roles = existing ? [...existing.roles, row.role.key] : [row.role.key];
    byId.set(row.user.id, {
      id: row.user.id,
      email: row.user.email,
      roles,
      disabled: row.user.disabled,
      employeeId: row.user.employee?.id ?? existing?.employeeId ?? null,
      customerId: row.user.customerUser?.customerId ?? existing?.customerId ?? null,
    });
  }
  return [...byId.values()];
}

async function processExpirationReminders(args: {
  now: Date;
  settings: DocumentNotificationSettings;
  directory: RecipientUser[];
  sendEmail: SendEmail;
  emailEnabled: boolean;
  counts: SchedulerCounts;
}) {
  const documents = await prisma.managedDocument.findMany({
    where: {
      expirationDate: { not: null },
      lifecycleStatus: { notIn: ["ARCHIVED", "SUPERSEDED"] },
      archivedAt: null,
    },
    select: DOCUMENT_SELECT,
  });

  const rules = await prisma.documentRequirementRule.findMany({
    select: { documentType: true, reminderThresholdDays: true, escalationRules: true },
  });
  const ruleByType = new Map(rules.map((rule) => [rule.documentType, rule]));

  for (const document of documents) {
    args.counts.evaluated += 1;
    if (!isActiveDocument(document) || !document.expirationDate) continue;
    const daysRemaining = calendarDaysUntil(document.expirationDate, args.now);
    const expired = daysRemaining <= 0;
    if (expired && !args.settings.includeExpired) continue;
    const rule = document.documentType ? ruleByType.get(document.documentType) : undefined;
    const thresholds = Array.isArray(rule?.reminderThresholdDays)
      ? (rule.reminderThresholdDays as number[]).filter((day) => Number.isFinite(day) && day > 0)
      : args.settings.thresholdsDays;
    const threshold = expired ? ("expired" as const) : activeExpirationThreshold(daysRemaining, thresholds.length ? thresholds : args.settings.thresholdsDays);
    if (threshold == null) continue;

    const type: NotificationType = expired ? "DOCUMENT_EXPIRED" : "DOCUMENT_EXPIRING";
    const audiences = audiencesForThreshold(args.settings, threshold, parseEscalationJson(rule?.escalationRules));
    if (audiences.includes("admin") || audiences.includes("reviewer")) args.counts.escalations += 1;

    const recipients = recipientsForDocument({
      document,
      directory: args.directory,
      audiences,
      type,
    });

    for (const recipient of recipients) {
      await deliverNotification({
        recipient,
        type,
        thresholdKey: thresholdKeyForDays(threshold),
        documentId: document.id,
        documentType: document.documentType,
        documentName: document.name,
        expirationDate: document.expirationDate,
        daysRemaining: expired ? 0 : daysRemaining,
        sendEmail: args.sendEmail,
        emailEnabled: args.emailEnabled,
        counts: args.counts,
        escalated: audiences.includes("admin") || audiences.includes("reviewer"),
      });
    }
  }
}

async function processMissingRequirements(args: {
  now: Date;
  settings: DocumentNotificationSettings;
  directory: RecipientUser[];
  sendEmail: SendEmail;
  emailEnabled: boolean;
  counts: SchedulerCounts;
}) {
  const [rules, employees] = await Promise.all([
    prisma.documentRequirementRule.findMany({
      include: { requirement: true },
    }),
    prisma.employee.findMany({
      where: { status: { notIn: ["TERMINATED"] }, userId: { not: null } },
      select: {
        id: true,
        userId: true,
        isDriver: true,
        classification: true,
        jobTitle: true,
        documents: {
          select: {
            document: {
              select: {
                documentType: true,
                verificationStatus: true,
                suggestedTypeStatus: true,
                lifecycleStatus: true,
                expirationDate: true,
                archivedAt: true,
                employeeLinks: { select: { employeeId: true } },
                customerLinks: { select: { customerId: true } },
                contractLinks: { select: { contractId: true } },
                deliveryLinks: { select: { deliveryId: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  for (const employee of employees) {
    for (const rule of rules) {
      if (!requirementAppliesToEmployee(rule.appliesTo, employee)) continue;
      args.counts.evaluated += 1;
      const qualifying = employee.documents.some((link) => {
        const document = link.document;
        return (
          document.documentType === rule.documentType &&
          documentSatisfiesRequirement(
            {
              ...document,
              employeeLinks: document.employeeLinks,
              customerLinks: document.customerLinks,
              contractLinks: document.contractLinks,
              deliveryLinks: document.deliveryLinks,
            },
            args.now,
          )
        );
      });
      if (qualifying) continue;

      const hasExpiredVerified = employee.documents.some((link) => {
        const document = link.document;
        return (
          document.documentType === rule.documentType &&
          document.verificationStatus === "VERIFIED" &&
          Boolean(document.expirationDate && document.expirationDate.getTime() < args.now.getTime())
        );
      });

      const ruleEscalation = parseEscalationJson(rule.escalationRules);
      const audiences = audiencesForThreshold(args.settings, hasExpiredVerified ? "expired" : 30, ruleEscalation);
      const type: NotificationType = "REQUIRED_DOCUMENT_MISSING";
      const recipients = uniqueRecipients([
        ...recipientsForAudiences({
          directory: args.directory,
          audiences,
          associatedEmployeeIds: [employee.id],
          associatedCustomerIds: [],
          companyOrUnlinked: false,
          type,
        }),
      ]);
      if (audiences.includes("admin")) args.counts.escalations += 1;

      for (const recipient of recipients) {
        await deliverNotification({
          recipient,
          type,
          thresholdKey: "missing",
          requirementId: rule.requirementId,
          employeeId: employee.id,
          documentType: rule.documentType,
          requirementName: rule.requirement.name,
          sendEmail: args.sendEmail,
          emailEnabled: args.emailEnabled,
          counts: args.counts,
          escalated: isAdminAudience(recipient.roles),
        });
      }

      const adminType: NotificationType = hasExpiredVerified ? "COMPLIANCE_NON_COMPLIANT" : "COMPLIANCE_ACTION_REQUIRED";
      const admins = args.directory.filter((user) => isAdminAudience(user.roles) && args.settings.adminEscalation);
      for (const recipient of admins) {
        await deliverNotification({
          recipient,
          type: adminType,
          thresholdKey: "missing",
          requirementId: rule.requirementId,
          employeeId: employee.id,
          documentType: rule.documentType,
          requirementName: rule.requirement.name,
          sendEmail: args.sendEmail,
          emailEnabled: args.emailEnabled,
          counts: args.counts,
          escalated: true,
        });
      }
    }
  }
}

async function processNeedsReviewReminders(args: {
  now: Date;
  settings: DocumentNotificationSettings;
  directory: RecipientUser[];
  sendEmail: SendEmail;
  emailEnabled: boolean;
  counts: SchedulerCounts;
}) {
  const documents = await prisma.managedDocument.findMany({
    where: {
      lifecycleStatus: "NEEDS_REVIEW",
      archivedAt: null,
    },
    select: DOCUMENT_SELECT,
  });

  const reviewers = args.directory.filter((user) => isReviewerAudience(user.roles));
  for (const document of documents) {
    args.counts.evaluated += 1;
    const start = document.extractionCompletedAt ?? document.createdAt;
    const ageHours = hoursSince(start, args.now);
    const bucket = needsReviewAgeKey(ageHours, args.settings.needsReviewHours);
    if (bucket == null) continue;
    for (const recipient of reviewers) {
      await deliverNotification({
        recipient,
        type: "DOCUMENT_NEEDS_REVIEW",
        thresholdKey: reviewAgeThresholdKey(bucket),
        documentId: document.id,
        documentType: document.documentType,
        documentName: document.name,
        sendEmail: args.sendEmail,
        emailEnabled: args.emailEnabled,
        counts: args.counts,
        escalated: bucket >= 72,
      });
    }
  }
}

export async function notifyDocumentRejected(args: {
  documentId: string;
  documentType: string | null;
  rejectionReason: string | null;
  uploadedBy: string | null;
  associatedEmployeeUserIds: string[];
}) {
  const emailEnabled = documentEmailNotificationsEnabled();
  const directory = await loadRecipientDirectory();
  const counts = emptyCounts();
  const recipientIds = new Set(
    [args.uploadedBy, ...args.associatedEmployeeUserIds].filter((id): id is string => Boolean(id)),
  );
  const recipients = directory.filter((user) => recipientIds.has(user.id));
  for (const recipient of recipients) {
    if (recipient.roles.includes("CUSTOMER") && args.associatedEmployeeUserIds.length && recipient.id !== args.uploadedBy) {
      continue;
    }
    await deliverNotification({
      recipient,
      type: "DOCUMENT_REJECTED",
      thresholdKey: "rejected",
      documentId: args.documentId,
      documentType: args.documentType,
      rejectionReason: args.rejectionReason,
      sendEmail: sendTransactionalEmail,
      emailEnabled,
      counts,
      escalated: false,
    });
  }
  return counts;
}

async function deliverNotification(args: {
  recipient: RecipientUser;
  type: NotificationType;
  thresholdKey: string;
  documentId?: string;
  requirementId?: string;
  employeeId?: string;
  documentType?: string | null;
  documentName?: string | null;
  requirementName?: string | null;
  expirationDate?: Date | null;
  rejectionReason?: string | null;
  daysRemaining?: number | null;
  sendEmail: SendEmail;
  emailEnabled: boolean;
  counts: SchedulerCounts;
  escalated: boolean;
}) {
  const dedupeKey = documentNotificationDedupeKey({
    documentId: args.documentId,
    requirementId: args.requirementId,
    employeeId: args.employeeId,
    recipientId: args.recipient.id,
    type: args.type,
    thresholdKey: args.thresholdKey,
  });
  const existing = await prisma.notification.findUnique({ where: { dedupeKey } });
  if (existing) {
    args.counts.skippedDuplicate += 1;
    await writeAuditLog({
      action: "document.notification.skipped_duplicate",
      targetType: "notification",
      targetId: existing.id,
      metadata: { dedupeKey, type: args.type, thresholdKey: args.thresholdKey },
    });
    return;
  }

  const copy = documentNotificationCopy({
    type: args.type,
    documentName: args.documentName,
    documentType: args.documentType,
    expirationDate: args.expirationDate,
    requirementName: args.requirementName,
    rejectionReason: args.rejectionReason,
    daysRemaining: args.daysRemaining,
  });
  const href = portalHrefForRecipient({ roles: args.recipient.roles, documentId: args.documentId });
  const path = safePath(href);

  const emailStatus = args.emailEnabled ? "PENDING" : "SUPPRESSED";
  try {
    const created = await prisma.notification.create({
      data: {
        userId: args.recipient.id,
        type: args.type,
        title: copy.title,
        body: copy.body,
        href: path,
        dedupeKey,
        thresholdKey: args.thresholdKey,
        emailStatus,
      },
    });
    args.counts.created += 1;
    await writeAuditLog({
      action: "document.notification.created",
      targetType: "notification",
      targetId: created.id,
      metadata: {
        type: args.type,
        thresholdKey: args.thresholdKey,
        documentId: args.documentId ?? null,
        recipientId: args.recipient.id,
      },
    });
    if (args.escalated) {
      await writeAuditLog({
        action: "document.notification.escalation_triggered",
        targetType: "notification",
        targetId: created.id,
        metadata: { type: args.type, thresholdKey: args.thresholdKey },
      });
    }

    if (!args.emailEnabled) {
      args.counts.emailSuppressed += 1;
      await writeAuditLog({
        action: "document.notification.email_suppressed",
        targetType: "notification",
        targetId: created.id,
        metadata: { reason: "DOCUMENT_EMAIL_NOTIFICATIONS_disabled" },
      });
      return;
    }

    await attemptNotificationEmail({
      notificationId: created.id,
      recipient: args.recipient,
      subject: copy.title,
      body: copy.body,
      href,
      sendEmail: args.sendEmail,
      counts: args.counts,
    });
  } catch (error) {
    if (isUniqueDedupeError(error)) {
      args.counts.skippedDuplicate += 1;
      await writeAuditLog({
        action: "document.notification.skipped_duplicate",
        targetType: "notification",
        metadata: { dedupeKey, type: args.type },
      });
    } else {
      throw error;
    }
  }
}

async function attemptNotificationEmail(args: {
  notificationId: string;
  recipient: RecipientUser;
  subject: string;
  body: string;
  href: string;
  sendEmail: SendEmail;
  counts: SchedulerCounts;
  retried?: boolean;
}) {
  args.counts.emailAttempted += 1;
  await writeAuditLog({
    action: "document.notification.email_attempted",
    targetType: "notification",
    targetId: args.notificationId,
    metadata: { recipientId: args.recipient.id },
  });
  try {
    await args.sendEmail({
      to: args.recipient.email,
      subject: args.subject,
      html: documentNotificationEmailHtml({ body: args.body, href: args.href }),
    });
    args.counts.emailSent += 1;
    if (args.retried) args.counts.emailRetried += 1;
    await prisma.notification.update({
      where: { id: args.notificationId },
      data: { emailStatus: "SENT", emailAttemptedAt: new Date() },
    });
    await writeAuditLog({
      action: "document.notification.email_sent",
      targetType: "notification",
      targetId: args.notificationId,
      metadata: { recipientId: args.recipient.id },
    });
  } catch (error) {
    args.counts.emailFailed += 1;
    await prisma.notification.update({
      where: { id: args.notificationId },
      data: { emailStatus: "FAILED", emailAttemptedAt: new Date() },
    });
    await writeAuditLog({
      action: "document.notification.email_failed",
      targetType: "notification",
      targetId: args.notificationId,
      metadata: {
        recipientId: args.recipient.id,
        error: error instanceof EmailDeliveryError ? "delivery_failed" : "delivery_failed",
      },
    });
  }
}

async function retryFailedDocumentEmails(args: {
  sendEmail: SendEmail;
  emailEnabled: boolean;
  counts: SchedulerCounts;
}) {
  if (!args.emailEnabled) return;
  const failed = await prisma.notification.findMany({
    where: {
      emailStatus: "FAILED",
      type: {
        in: [
          "DOCUMENT_EXPIRING",
          "DOCUMENT_EXPIRED",
          "REQUIRED_DOCUMENT_MISSING",
          "DOCUMENT_REJECTED",
          "DOCUMENT_NEEDS_REVIEW",
          "COMPLIANCE_ACTION_REQUIRED",
          "COMPLIANCE_NON_COMPLIANT",
        ],
      },
    },
    include: { user: { select: { id: true, email: true, disabled: true, roles: { include: { role: true } } } } },
    take: 100,
  });
  for (const notification of failed) {
    if (!notification.user || notification.user.disabled) continue;
    await attemptNotificationEmail({
      notificationId: notification.id,
      recipient: {
        id: notification.user.id,
        email: notification.user.email,
        roles: notification.user.roles.map((row) => row.role.key),
        disabled: notification.user.disabled,
      },
      subject: notification.title,
      body: notification.body,
      href: absolutePortalHref(notification.href),
      sendEmail: args.sendEmail,
      counts: args.counts,
      retried: true,
    });
  }
}

function recipientsForDocument(args: {
  document: {
    employeeLinks: { employeeId: string; employee: { id: true; userId: string | null } | { id: string; userId: string | null } }[];
    customerLinks: { customerId: string }[];
    contractLinks: { contract: { customerId: string } }[];
    deliveryLinks: { delivery: { customerId: string; driverEmployeeId: string | null } }[];
  };
  directory: RecipientUser[];
  audiences: NotificationAudience[];
  type: NotificationType;
}) {
  const associatedEmployeeIds = args.document.employeeLinks.map((link) => link.employeeId);
  const associatedCustomerIds = [
    ...args.document.customerLinks.map((link) => link.customerId),
    ...args.document.contractLinks.map((link) => link.contract.customerId),
    ...args.document.deliveryLinks.map((link) => link.delivery.customerId),
  ];
  const companyOrUnlinked = associatedEmployeeIds.length === 0;
  return recipientsForAudiences({
    directory: args.directory,
    audiences: args.audiences,
    associatedEmployeeIds,
    associatedCustomerIds,
    companyOrUnlinked,
    type: args.type,
  });
}

function recipientsForAudiences(args: {
  directory: RecipientUser[];
  audiences: NotificationAudience[];
  associatedEmployeeIds: string[];
  associatedCustomerIds: string[];
  companyOrUnlinked: boolean;
  type: NotificationType;
}) {
  const pool: RecipientUser[] = [];
  if (args.audiences.includes("employee")) {
    pool.push(
      ...args.directory.filter(
        (user) => user.employeeId && args.associatedEmployeeIds.includes(user.employeeId),
      ),
    );
  }
  if (args.audiences.includes("admin")) {
    pool.push(...args.directory.filter((user) => isAdminAudience(user.roles)));
  }
  if (args.audiences.includes("reviewer")) {
    pool.push(...args.directory.filter((user) => isReviewerAudience(user.roles)));
  }
  return filterRecipientsForType(uniqueRecipients(pool), args.type, {
    associatedEmployeeIds: args.associatedEmployeeIds,
    associatedCustomerIds: args.associatedCustomerIds,
    companyOrUnlinked: args.companyOrUnlinked,
  });
}

function parseEscalationJson(value: unknown): EscalationRule[] | null {
  if (!Array.isArray(value)) return null;
  const rules: EscalationRule[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const thresholdRaw = "threshold" in entry ? (entry as { threshold: unknown }).threshold : undefined;
    const threshold =
      thresholdRaw === "expired"
        ? "expired"
        : typeof thresholdRaw === "number" && thresholdRaw > 0
          ? thresholdRaw
          : null;
    const audiences = Array.isArray((entry as { audiences?: unknown }).audiences)
      ? ((entry as { audiences: unknown[] }).audiences.filter(
          (item) => item === "employee" || item === "admin" || item === "reviewer",
        ) as NotificationAudience[])
      : [];
    if (threshold != null && audiences.length) rules.push({ threshold, audiences });
  }
  return rules.length ? rules : null;
}

function isUniqueDedupeError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

function safePath(href: string) {
  try {
    return new URL(href).pathname;
  } catch {
    return href.startsWith("/") ? href : "/dashboard/documents";
  }
}

function absolutePortalHref(href: string | null | undefined) {
  if (!href) return `${appOrigin()}/dashboard/documents`;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return `${appOrigin()}${href.startsWith("/") ? href : `/${href}`}`;
}
