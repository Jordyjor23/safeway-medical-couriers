import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROLE_PERMISSIONS, canAccessPortal, roleHasPermission } from "@/lib/permissions";
import { documentMayCountTowardRequirement } from "@/lib/documents/compliance-gate";
import { missingRequirementLabels } from "@/lib/documents/buckets";
import { MANUAL_EXTRACTION_MESSAGE, extractionManualEntryNotice, isExtractionUnsupportedFormat } from "@/lib/documents/extraction/unsupported";
import { TestDocumentExtractionService } from "@/lib/documents/extraction/test-provider";
import {
  documentEmailNotificationsEnabled,
  audiencesForThreshold,
  normalizeDocumentNotificationSettings,
} from "@/lib/documents/notification-config";
import {
  activeExpirationThreshold,
  calendarDaysUntil,
  documentNotificationDedupeKey,
  needsReviewAgeKey,
} from "@/lib/documents/notification-keys";
import { documentNotificationCopy, documentNotificationEmailHtml, sanitizePublicText } from "@/lib/documents/notification-copy";
import {
  filterRecipientsForType,
  operationsManagerMayReviewExtraction,
  operationsManagerMayVerify,
  roleCanReceiveDocumentNotification,
  type RecipientUser,
} from "@/lib/documents/notification-recipients";
import { documentSatisfiesRequirement } from "@/lib/documents/qualifying-document";

const prisma = vi.hoisted(() => ({
  userRole: { findMany: vi.fn() },
  managedDocument: { findMany: vi.fn() },
  documentRequirementRule: { findMany: vi.fn() },
  employee: { findMany: vi.fn() },
  notification: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  systemSetting: { findUnique: vi.fn() },
}));

const writeAuditLog = vi.hoisted(() => vi.fn<(input: { action: string }) => Promise<void>>());
const sendTransactionalEmail = vi.hoisted(() => vi.fn<(args: { html?: string }) => Promise<{ id: string }>>());

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/audit", () => ({ writeAuditLog }));
vi.mock("@/lib/email", () => ({
  EmailDeliveryError: class EmailDeliveryError extends Error {
    constructor() {
      super("Email delivery failed.");
      this.name = "EmailDeliveryError";
    }
  },
  sendTransactionalEmail,
}));
vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(async (_key: string, fallback: unknown) => fallback),
}));

import { notifyDocumentRejected, runDocumentNotificationScheduler } from "@/lib/documents/notification-scheduler";

const NOW = new Date("2026-08-29T12:00:00.000Z");

function addDays(days: number) {
  const date = new Date(Date.UTC(2026, 7, 29));
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function employeeUser(overrides: Partial<RecipientUser> = {}): RecipientUser {
  return {
    id: "emp-user",
    email: "driver@example.com",
    roles: ["DRIVER", "EMPLOYEE"],
    employeeId: "emp-1",
    customerId: null,
    disabled: false,
    ...overrides,
  };
}

function adminUser(overrides: Partial<RecipientUser> = {}): RecipientUser {
  return {
    id: "admin-user",
    email: "admin@example.com",
    roles: ["ADMIN"],
    employeeId: null,
    customerId: null,
    disabled: false,
    ...overrides,
  };
}

function ownerUser(): RecipientUser {
  return { id: "owner-user", email: "owner@example.com", roles: ["OWNER"], employeeId: null, customerId: null, disabled: false };
}

function opsUser(): RecipientUser {
  return {
    id: "ops-user",
    email: "ops@example.com",
    roles: ["OPERATIONS_MANAGER"],
    employeeId: null,
    customerId: null,
    disabled: false,
  };
}

function customerUser(): RecipientUser {
  return {
    id: "cust-user",
    email: "client@example.com",
    roles: ["CUSTOMER"],
    employeeId: null,
    customerId: "cust-a",
    disabled: false,
  };
}

function directoryToRoles(users: RecipientUser[]) {
  return users.flatMap((user) =>
    user.roles.map((role) => ({
      role: { key: role },
      user: {
        id: user.id,
        email: user.email,
        disabled: Boolean(user.disabled),
        employee: user.employeeId ? { id: user.employeeId } : null,
        customerUser: user.customerId ? { customerId: user.customerId } : null,
      },
    })),
  );
}

function expiringDoc(days: number, id = `doc-${days}`) {
  return {
    id,
    name: days < 0 ? "Expired auto insurance" : "Auto insurance",
    documentType: "AUTO_INSURANCE",
    expirationDate: addDays(days),
    lifecycleStatus: "VERIFIED",
    verificationStatus: "VERIFIED",
    suggestedTypeStatus: "ACCEPTED",
    archivedAt: null,
    uploadedBy: "emp-user",
    extractionCompletedAt: null,
    createdAt: addDays(-10),
    employeeLinks: [{ employeeId: "emp-1", employee: { id: "emp-1", userId: "emp-user", isDriver: true } }],
    customerLinks: [],
    contractLinks: [],
    deliveryLinks: [],
  };
}

const store = new Map<string, { id: string; type: string; userId: string; title: string; body: string; href: string; dedupeKey: string; emailStatus: string }>();

function resetNotificationStore() {
  store.clear();
  prisma.notification.findUnique.mockImplementation(async ({ where }: { where: { dedupeKey: string } }) => store.get(where.dedupeKey) ?? null);
  prisma.notification.create.mockImplementation(async ({ data }: { data: { dedupeKey: string; userId: string; type: string; title: string; body: string; href: string; emailStatus: string } }) => {
    if (store.has(data.dedupeKey)) {
      const error = Object.assign(new Error("Unique"), { code: "P2002" });
      throw error;
    }
    const row = { id: `n-${store.size + 1}`, ...data };
    store.set(data.dedupeKey, row);
    return row;
  });
  prisma.notification.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    for (const row of store.values()) {
      if (row.id === where.id) Object.assign(row, data);
    }
    return {};
  });
  prisma.notification.findMany.mockImplementation(async ({ where }: { where?: { emailStatus?: string } }) => {
    if (where?.emailStatus === "FAILED") {
      return [...store.values()]
        .filter((row) => row.emailStatus === "FAILED")
        .map((row) => ({
          ...row,
          user: { id: row.userId, email: row.userId === "emp-user" ? "driver@example.com" : "admin@example.com", disabled: false, roles: [{ role: { key: row.userId === "emp-user" ? "DRIVER" : "ADMIN" } }] },
        }));
    }
    return [];
  });
}

beforeEach(() => {
  resetNotificationStore();
  prisma.userRole.findMany.mockResolvedValue(directoryToRoles([employeeUser(), adminUser(), ownerUser(), opsUser(), customerUser()]));
  prisma.documentRequirementRule.findMany.mockResolvedValue([]);
  prisma.employee.findMany.mockResolvedValue([]);
  prisma.managedDocument.findMany.mockResolvedValue([]);
  prisma.systemSetting.findUnique.mockResolvedValue(null);
  sendTransactionalEmail.mockResolvedValue({ id: "email_1" });
  delete process.env.DOCUMENT_EMAIL_NOTIFICATIONS;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("phase 5 thresholds and idempotency keys", () => {
  it("fires 90/60/30/14/7/1 and expired in separate windows", () => {
    const thresholds = [90, 60, 30, 14, 7, 1];
    expect(activeExpirationThreshold(90, thresholds)).toBe(90);
    expect(activeExpirationThreshold(61, thresholds)).toBe(90);
    expect(activeExpirationThreshold(60, thresholds)).toBe(60);
    expect(activeExpirationThreshold(31, thresholds)).toBe(60);
    expect(activeExpirationThreshold(30, thresholds)).toBe(30);
    expect(activeExpirationThreshold(15, thresholds)).toBe(30);
    expect(activeExpirationThreshold(14, thresholds)).toBe(14);
    expect(activeExpirationThreshold(8, thresholds)).toBe(14);
    expect(activeExpirationThreshold(7, thresholds)).toBe(7);
    expect(activeExpirationThreshold(2, thresholds)).toBe(7);
    expect(activeExpirationThreshold(1, thresholds)).toBe(1);
    expect(activeExpirationThreshold(0, thresholds)).toBeNull();
    expect(calendarDaysUntil(addDays(-1), NOW)).toBeLessThan(0);
  });

  it("uses a stable dedupe key per document, recipient, type, and threshold", () => {
    const first = documentNotificationDedupeKey({
      documentId: "doc-1",
      recipientId: "emp-user",
      type: "DOCUMENT_EXPIRING",
      thresholdKey: "30d",
    });
    const second = documentNotificationDedupeKey({
      documentId: "doc-1",
      recipientId: "emp-user",
      type: "DOCUMENT_EXPIRING",
      thresholdKey: "14d",
    });
    expect(first).not.toBe(second);
    expect(first).toContain("doc:doc-1");
    expect(first).toContain("30d");
  });
});

describe("phase 5 expiration scheduler", () => {
  it("creates 90/60/30/14/7/expired reminders for the associated employee", async () => {
    prisma.managedDocument.findMany.mockImplementation(async ({ where }: { where: { lifecycleStatus?: string | { notIn?: string[] }; expirationDate?: unknown } }) => {
      if (where.lifecycleStatus === "NEEDS_REVIEW") return [];
      return [expiringDoc(90, "d90"), expiringDoc(60, "d60"), expiringDoc(30, "d30"), expiringDoc(14, "d14"), expiringDoc(7, "d7"), expiringDoc(-1, "dexp")];
    });
    const result = await runDocumentNotificationScheduler({ now: NOW, emailEnabled: false });
    expect(result.created).toBeGreaterThanOrEqual(6);
    const titles = [...store.values()].filter((row) => row.userId === "emp-user").map((row) => row.title);
    expect(titles.some((title) => title.toLowerCase().includes("90"))).toBe(true);
    expect(titles.some((title) => title.toLowerCase().includes("expired"))).toBe(true);
  });

  it("skips archived documents", async () => {
    prisma.managedDocument.findMany.mockImplementation(async ({ where }: { where: { lifecycleStatus?: string } }) => {
      if (where.lifecycleStatus === "NEEDS_REVIEW") return [];
      return [{ ...expiringDoc(30, "arch"), lifecycleStatus: "ARCHIVED", archivedAt: NOW }];
    });
    const result = await runDocumentNotificationScheduler({ now: NOW, emailEnabled: false });
    expect([...store.values()].some((row) => row.dedupeKey.includes("arch"))).toBe(false);
    expect(result.created).toBe(0);
  });

  it("skips superseded documents", async () => {
    prisma.managedDocument.findMany.mockImplementation(async ({ where }: { where: { lifecycleStatus?: string } }) => {
      if (where.lifecycleStatus === "NEEDS_REVIEW") return [];
      return [{ ...expiringDoc(30, "sup"), lifecycleStatus: "SUPERSEDED" }];
    });
    await runDocumentNotificationScheduler({ now: NOW, emailEnabled: false });
    expect(store.size).toBe(0);
  });

  it("does not create a second row on a duplicate scheduler run", async () => {
    prisma.managedDocument.findMany.mockImplementation(async ({ where }: { where: { lifecycleStatus?: string } }) => {
      if (where.lifecycleStatus === "NEEDS_REVIEW") return [];
      return [expiringDoc(30, "dup")];
    });
    const first = await runDocumentNotificationScheduler({ now: NOW, emailEnabled: false });
    const second = await runDocumentNotificationScheduler({ now: NOW, emailEnabled: false });
    expect(first.created).toBeGreaterThan(0);
    expect(second.skippedDuplicate).toBeGreaterThan(0);
    expect(second.created).toBe(0);
    expect(writeAuditLog.mock.calls.some((call) => call[0].action === "document.notification.skipped_duplicate")).toBe(true);
  });
});

describe("phase 5 missing requirements", () => {
  it("notifies when a required document is missing", async () => {
    prisma.documentRequirementRule.findMany.mockResolvedValue([
      { id: "rule-1", requirementId: "req-1", documentType: "DRIVERS_LICENSE", appliesTo: "ALL", escalationRules: null, requirement: { name: "Driver qualification" } },
    ]);
    prisma.employee.findMany.mockResolvedValue([
      {
        id: "emp-1",
        userId: "emp-user",
        isDriver: true,
        classification: "W2_EMPLOYEE",
        jobTitle: "Courier",
        documents: [],
      },
    ]);
    await runDocumentNotificationScheduler({ now: NOW, emailEnabled: false });
    expect([...store.values()].some((row) => row.type === "REQUIRED_DOCUMENT_MISSING")).toBe(true);
    expect([...store.values()].some((row) => row.type === "COMPLIANCE_ACTION_REQUIRED")).toBe(true);
  });

  it("does not treat an unverified OCR file as satisfying a requirement", () => {
    const unverified = {
      documentType: "DRIVERS_LICENSE",
      verificationStatus: "UNVERIFIED" as const,
      suggestedTypeStatus: "PENDING",
      lifecycleStatus: "NEEDS_REVIEW" as const,
      expirationDate: addDays(90),
      archivedAt: null,
      employeeLinks: [{ employeeId: "emp-1" }],
      customerLinks: [],
      contractLinks: [],
      deliveryLinks: [],
    };
    expect(documentMayCountTowardRequirement(unverified)).toBe(false);
    expect(documentSatisfiesRequirement(unverified, NOW)).toBe(false);
    expect(
      missingRequirementLabels({
        rules: [{ documentType: "DRIVERS_LICENSE", requirement: { name: "Driver qualification" } }],
        records: [],
        documents: [unverified],
      }),
    ).toEqual(["Driver qualification"]);
  });
});

describe("phase 5 rejected and needs-review", () => {
  it("creates a rejected notification for the uploader without file contents", async () => {
    await notifyDocumentRejected({
      documentId: "doc-rej",
      documentType: "AUTO_INSURANCE",
      rejectionReason: "Photo is blurry",
      uploadedBy: "emp-user",
      associatedEmployeeUserIds: ["emp-user"],
    });
    const row = [...store.values()].find((item) => item.type === "DOCUMENT_REJECTED");
    expect(row?.body).toContain("blurry");
    expect(row?.body.toLowerCase()).toContain("replacement");
    expect(row?.body).not.toContain("private/");
    expect(row?.body).not.toContain("policy");
  });

  it("sends needs-review reminders at 24h / 3 days / 7 days, not every tick", async () => {
    const createdAt = new Date(NOW.getTime() - 25 * 60 * 60 * 1000);
    prisma.managedDocument.findMany.mockImplementation(async ({ where }: { where: { lifecycleStatus?: string } }) => {
      if (where.lifecycleStatus === "NEEDS_REVIEW") {
        return [
          {
            ...expiringDoc(90, "review-1"),
            lifecycleStatus: "NEEDS_REVIEW",
            verificationStatus: "UNVERIFIED",
            extractionCompletedAt: createdAt,
            createdAt,
            employeeLinks: [],
          },
        ];
      }
      return [];
    });
    const first = await runDocumentNotificationScheduler({ now: NOW, emailEnabled: false });
    const second = await runDocumentNotificationScheduler({ now: NOW, emailEnabled: false });
    expect(first.created).toBeGreaterThan(0);
    expect([...store.values()].some((row) => row.type === "DOCUMENT_NEEDS_REVIEW" && row.userId === "admin-user")).toBe(true);
    expect([...store.values()].some((row) => row.type === "DOCUMENT_NEEDS_REVIEW" && row.userId === "ops-user")).toBe(false);
    expect(second.skippedDuplicate).toBeGreaterThan(0);
    expect(needsReviewAgeKey(23, [24, 72, 168])).toBeNull();
    expect(needsReviewAgeKey(24, [24, 72, 168])).toBe(24);
    expect(needsReviewAgeKey(80, [24, 72, 168])).toBe(72);
    expect(needsReviewAgeKey(200, [24, 72, 168])).toBe(168);
  });
});

describe("phase 5 email channel", () => {
  it("keeps in-app rows and skips email when DOCUMENT_EMAIL_NOTIFICATIONS is false", async () => {
    process.env.DOCUMENT_EMAIL_NOTIFICATIONS = "false";
    expect(documentEmailNotificationsEnabled()).toBe(false);
    prisma.managedDocument.findMany.mockImplementation(async ({ where }: { where: { lifecycleStatus?: string } }) => {
      if (where.lifecycleStatus === "NEEDS_REVIEW") return [];
      return [expiringDoc(30, "mail-off")];
    });
    const result = await runDocumentNotificationScheduler({ now: NOW, emailEnabled: false });
    expect(result.created).toBeGreaterThan(0);
    expect(result.emailSuppressed).toBeGreaterThan(0);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(writeAuditLog.mock.calls.some((call) => call[0].action === "document.notification.email_suppressed")).toBe(true);
    const body = [...store.values()][0]?.body ?? "";
    expect(body).toMatch(/expires on September/i);
    expect(body).not.toContain("policy");
  });

  it("sends email through the existing transport when enabled", async () => {
    prisma.managedDocument.findMany.mockImplementation(async ({ where }: { where: { lifecycleStatus?: string } }) => {
      if (where.lifecycleStatus === "NEEDS_REVIEW") return [];
      return [expiringDoc(30, "mail-on")];
    });
    const result = await runDocumentNotificationScheduler({
      now: NOW,
      emailEnabled: true,
      sendEmail: sendTransactionalEmail,
    });
    expect(result.emailSent).toBeGreaterThan(0);
    expect(sendTransactionalEmail).toHaveBeenCalled();
    const payload = sendTransactionalEmail.mock.calls[0][0];
    expect(payload.html).not.toContain("blob.vercel");
    expect(payload.html).not.toMatch(/\d{3}-\d{2}-\d{4}/);
    expect(writeAuditLog.mock.calls.some((call) => call[0].action === "document.notification.email_sent")).toBe(true);
  });

  it("keeps the in-app row and retries email without duplicating notifications after failure", async () => {
    sendTransactionalEmail.mockRejectedValueOnce(new Error("down")).mockResolvedValue({ id: "email_retry" });
    prisma.managedDocument.findMany.mockImplementation(async ({ where }: { where: { lifecycleStatus?: string } }) => {
      if (where.lifecycleStatus === "NEEDS_REVIEW") return [];
      return [expiringDoc(30, "mail-fail")];
    });
    const first = await runDocumentNotificationScheduler({ now: NOW, emailEnabled: true, sendEmail: sendTransactionalEmail });
    expect(first.created).toBeGreaterThan(0);
    expect(first.emailFailed).toBeGreaterThan(0);
    expect(writeAuditLog.mock.calls.some((call) => call[0].action === "document.notification.email_failed")).toBe(true);
    const createdCount = store.size;
    const second = await runDocumentNotificationScheduler({ now: NOW, emailEnabled: true, sendEmail: sendTransactionalEmail });
    expect(store.size).toBe(createdCount);
    expect(second.emailRetried).toBeGreaterThan(0);
    expect(second.created).toBe(0);
  });
});

describe("phase 5 recipient isolation", () => {
  it("never sends internal employee compliance to a customer", () => {
    const recipients = filterRecipientsForType([customerUser(), employeeUser()], "REQUIRED_DOCUMENT_MISSING", {
      associatedEmployeeIds: ["emp-1"],
      associatedCustomerIds: [],
      companyOrUnlinked: false,
    });
    expect(recipients.map((user) => user.id)).toEqual(["emp-user"]);
    expect(roleCanReceiveDocumentNotification("CUSTOMER", "REQUIRED_DOCUMENT_MISSING")).toBe(false);
  });

  it("limits employees to their own associated documents", () => {
    const other = employeeUser({ id: "other", employeeId: "emp-2" });
    const recipients = filterRecipientsForType([other, employeeUser()], "DOCUMENT_EXPIRING", {
      associatedEmployeeIds: ["emp-1"],
      associatedCustomerIds: [],
      companyOrUnlinked: false,
    });
    expect(recipients.map((user) => user.id)).toEqual(["emp-user"]);
  });

  it("escalates 7-day and expired windows to admin", () => {
    const settings = normalizeDocumentNotificationSettings({});
    expect(audiencesForThreshold(settings, 30)).toEqual(["employee"]);
    expect(audiencesForThreshold(settings, 7)).toEqual(["employee", "admin"]);
    expect(audiencesForThreshold(settings, "expired")).toEqual(["employee", "admin"]);
  });

  it("keeps Operations Manager off extraction accept and verify (decision A)", () => {
    expect(ROLE_PERMISSIONS.OPERATIONS_MANAGER).not.toContain("documents.editMetadata");
    expect(ROLE_PERMISSIONS.OPERATIONS_MANAGER).not.toContain("documents.verify");
    expect(operationsManagerMayReviewExtraction()).toBe(false);
    expect(operationsManagerMayVerify()).toBe(false);
    expect(roleHasPermission("OPERATIONS_MANAGER", "documents.verify")).toBe(false);
    expect(canAccessPortal(["OPERATIONS_MANAGER"], "staff")).toBe(false);
    expect(roleCanReceiveDocumentNotification("OPERATIONS_MANAGER", "DOCUMENT_NEEDS_REVIEW")).toBe(false);
  });
});

describe("phase 5 HEIC/DOCX extraction copy", () => {
  it("keeps HEIC and DOCX uploadable and shows the manual extraction message", async () => {
    expect(isExtractionUnsupportedFormat("image/heic", "scan.heic")).toBe(true);
    expect(isExtractionUnsupportedFormat("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "form.docx")).toBe(true);
    expect(extractionManualEntryNotice({ extractionStatus: "NOT_APPLICABLE" })).toBe(MANUAL_EXTRACTION_MESSAGE);
    const heic = await new TestDocumentExtractionService().extract({ mimeType: "image/heic", filename: "photo.heic" });
    expect(heic.status).toBe("NOT_APPLICABLE");
    expect(heic.error).toBe(MANUAL_EXTRACTION_MESSAGE);
    const docx = await new TestDocumentExtractionService().extract({
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: "packet.docx",
    });
    expect(docx.status).toBe("NOT_APPLICABLE");
    expect(docx.error).toBe(MANUAL_EXTRACTION_MESSAGE);
  });
});

describe("phase 5 email copy safety and audit", () => {
  it("does not put identifiers or blob URLs in notification email", () => {
    const copy = documentNotificationCopy({
      type: "DOCUMENT_EXPIRING",
      documentType: "AUTO_INSURANCE",
      expirationDate: new Date("2026-09-25T00:00:00Z"),
      daysRemaining: 27,
    });
    expect(copy.body).toBe("Your auto insurance document expires on September 25, 2026.");
    const html = documentNotificationEmailHtml({ body: copy.body, href: "https://portal.safewaycouriers.com/employee/dashboard" });
    expect(html).toContain("/employee/dashboard");
    expect(sanitizePublicText("Policy #ABC123456 DOB 01/01/1990")).toContain("[redacted]");
  });

  it("records evaluated, created, and escalation audit events", async () => {
    prisma.managedDocument.findMany.mockImplementation(async ({ where }: { where: { lifecycleStatus?: string } }) => {
      if (where.lifecycleStatus === "NEEDS_REVIEW") return [];
      return [expiringDoc(7, "esc")];
    });
    await runDocumentNotificationScheduler({ now: NOW, emailEnabled: false });
    const actions = writeAuditLog.mock.calls.map((call) => call[0].action);
    expect(actions).toContain("document.notification.evaluated");
    expect(actions).toContain("document.notification.created");
    expect(actions).toContain("document.notification.escalation_triggered");
  });

  it("does not add SMS configuration", () => {
    const settings = normalizeDocumentNotificationSettings({});
    expect(settings.channels.sms).toBe(false);
    const envExample = readFileSync(path.join(process.cwd(), ".env.example"), "utf8");
    expect(envExample).toContain("DOCUMENT_EMAIL_NOTIFICATIONS");
    expect(envExample).toMatch(/SMS is not enabled/i);
    const vercel = JSON.parse(readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")) as { crons: { path: string }[] };
    expect(vercel.crons).toEqual([{ path: "/api/cron/alerts", schedule: "0 13 * * *" }]);
  });
});
