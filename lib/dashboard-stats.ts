import { prisma } from "@/lib/db";
import { hasHrReviewSystemRole } from "@/lib/permissions";
import { hasPermission, type AuthContext } from "@/lib/rbac";
import { getDocumentAlertStats } from "@/lib/documents/alert-stats";

function soon(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export async function getDashboardOverview(ctx?: AuthContext) {
  const expiringBefore = soon(30);
  const canApplicants = !ctx || hasHrReviewSystemRole(ctx.roles);
  const canEmployees = !ctx || hasPermission(ctx, "employees.view");
  const canCustomers = !ctx || hasPermission(ctx, "customers.view");
  const canContracts = !ctx || hasPermission(ctx, "contracts.view");
  const canDocuments = !ctx || hasPermission(ctx, "documents.view");
  const canCompliance = !ctx || hasPermission(ctx, "compliance.view");
  const canAudit = !ctx || hasPermission(ctx, "audit.view");
  const canJobs = !ctx || hasPermission(ctx, "jobs.view");

  const [
    activeEmployees,
    activeCouriers,
    pendingApplicants,
    applicationsThisMonth,
    openPositions,
    activeCustomers,
    prospectiveCustomers,
    activeContracts,
    contractsExpiringSoon,
    pendingContracts,
    documentsExpiringSoon,
    complianceAlerts,
    upcomingTrainingExpirations,
    recentActivity,
    awaitingReview,
    documentsAwaitingReview,
  ] = await Promise.all([
    canEmployees ? prisma.employee.count({ where: { status: "ACTIVE" } }) : Promise.resolve(0),
    canEmployees
      ? prisma.employee.count({
          where: {
            status: "ACTIVE",
            OR: [
              { jobTitle: { contains: "Courier", mode: "insensitive" } },
              { classification: "INDEPENDENT_CONTRACTOR" },
            ],
          },
        })
      : Promise.resolve(0),
    canApplicants
      ? prisma.application.count({
          where: {
            status: {
              in: [
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
              ],
            },
          },
        })
      : Promise.resolve(0),
    canApplicants
      ? prisma.application.count({
          where: {
            submittedAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        })
      : Promise.resolve(0),
    canJobs ? prisma.jobOpening.count({ where: { status: "PUBLISHED" } }) : Promise.resolve(0),
    canCustomers ? prisma.customer.count({ where: { status: "ACTIVE" } }) : Promise.resolve(0),
    canCustomers
      ? prisma.customer.count({
          where: { status: { in: ["PROSPECT", "LEAD", "PROPOSAL_SENT", "NEGOTIATION"] } },
        })
      : Promise.resolve(0),
    canContracts ? prisma.contract.count({ where: { status: "ACTIVE" } }) : Promise.resolve(0),
    canContracts
      ? prisma.contract.count({
          where: {
            status: { in: ["ACTIVE", "EXPIRING"] },
            expirationDate: { lte: expiringBefore, gte: new Date() },
          },
        })
      : Promise.resolve(0),
    canContracts
      ? prisma.contract.count({
          where: {
            status: { in: ["DRAFT", "UNDER_REVIEW", "SENT", "NEGOTIATING", "AWAITING_SIGNATURE"] },
          },
        })
      : Promise.resolve(0),
    canDocuments
      ? prisma.managedDocument.count({
          where: {
            status: { in: ["CURRENT", "EXPIRING_SOON"] },
            expirationDate: { lte: expiringBefore, gte: new Date() },
          },
        })
      : Promise.resolve(0),
    canCompliance
      ? prisma.complianceRecord.count({
          where: { status: { in: ["EXPIRED", "MISSING", "EXPIRING_SOON"] } },
        })
      : Promise.resolve(0),
    canCompliance
      ? prisma.employeeTraining.count({
          where: {
            expiresAt: { lte: expiringBefore, gte: new Date() },
          },
        })
      : Promise.resolve(0),
    canAudit
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            action: true,
            targetType: true,
            createdAt: true,
            actorEmail: true,
          },
        })
      : Promise.resolve([]),
    canApplicants
      ? prisma.application.count({
          where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "DOCUMENTS_REQUIRED", "COMPLIANCE_REVIEW"] } },
        })
      : Promise.resolve(0),
    canDocuments
      ? prisma.managedDocument.count({
          where: { lifecycleStatus: "NEEDS_REVIEW", archivedAt: null },
        })
      : Promise.resolve(0),
  ]);

  return {
    activeEmployees,
    activeCouriers,
    pendingApplicants,
    applicationsThisMonth,
    openPositions,
    activeCustomers,
    prospectiveCustomers,
    activeContracts,
    contractsExpiringSoon,
    pendingContracts,
    documentsExpiringSoon,
    complianceAlerts,
    upcomingTrainingExpirations,
    recentActivity,
    awaitingReview,
    documentsAwaitingReview,
    visibility: {
      applicants: canApplicants,
      employees: canEmployees,
      customers: canCustomers,
      contracts: canContracts,
      documents: canDocuments,
      compliance: canCompliance,
      audit: canAudit,
      jobs: canJobs,
    },
  };
}

export async function getScopedDocumentAlertStats(ctx: AuthContext) {
  if (!hasPermission(ctx, "documents.view") && !hasPermission(ctx, "compliance.view")) {
    return {
      expiringIn30Days: 0,
      expired: 0,
      missingDocuments: 0,
      needsReview: 0,
      actionRequired: 0,
    };
  }
  return getDocumentAlertStats();
}
