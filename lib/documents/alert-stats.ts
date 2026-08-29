import { prisma } from "@/lib/db";
import { calendarDaysUntil } from "@/lib/documents/notification-keys";
import { documentSatisfiesRequirement } from "@/lib/documents/qualifying-document";

export async function getDocumentAlertStats(now = new Date()) {
  const in30 = new Date(now);
  in30.setUTCDate(in30.getUTCDate() + 30);

  const [expiring30, expired, needsReview, actionRequired, rules, employees] = await Promise.all([
    prisma.managedDocument.count({
      where: {
        archivedAt: null,
        lifecycleStatus: { notIn: ["ARCHIVED", "SUPERSEDED"] },
        expirationDate: { gte: now, lte: in30 },
      },
    }),
    prisma.managedDocument.count({
      where: {
        archivedAt: null,
        lifecycleStatus: { notIn: ["ARCHIVED", "SUPERSEDED"] },
        expirationDate: { lt: now },
      },
    }),
    prisma.managedDocument.count({
      where: { lifecycleStatus: "NEEDS_REVIEW", archivedAt: null },
    }),
    prisma.managedDocument.count({
      where: {
        archivedAt: null,
        OR: [
          { lifecycleStatus: "REJECTED" },
          { lifecycleStatus: "NEEDS_REVIEW" },
          { expirationDate: { lt: now }, lifecycleStatus: { notIn: ["ARCHIVED", "SUPERSEDED"] } },
        ],
      },
    }),
    prisma.documentRequirementRule.findMany({ select: { documentType: true, appliesTo: true, requirementId: true } }),
    prisma.employee.findMany({
      where: { status: { notIn: ["TERMINATED"] } },
      select: {
        id: true,
        isDriver: true,
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

  let missingDocuments = 0;
  if (rules.length) {
    for (const employee of employees) {
      for (const rule of rules) {
        if (rule.appliesTo === "DRIVER" && !employee.isDriver) continue;
        const ok = employee.documents.some((link) => link.document.documentType === rule.documentType && documentSatisfiesRequirement(link.document as never, now));
        if (!ok) missingDocuments += 1;
      }
    }
  }

  return {
    expiringIn30Days: expiring30,
    expired,
    missingDocuments,
    needsReview,
    actionRequired,
  };
}

export function daysRemainingLabel(expirationDate: Date | null | undefined, now = new Date()) {
  if (!expirationDate) return "—";
  const days = calendarDaysUntil(expirationDate, now);
  if (days < 0) return `${Math.abs(days)} overdue`;
  if (days === 0) return "Today";
  return `${days} day${days === 1 ? "" : "s"}`;
}
