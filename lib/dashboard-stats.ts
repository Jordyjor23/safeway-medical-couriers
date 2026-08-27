import { prisma } from "@/lib/db";

function soon(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export async function getDashboardOverview() {
  const expiringBefore = soon(30);

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
  ] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.employee.count({
      where: {
        status: "ACTIVE",
        OR: [
          { jobTitle: { contains: "Courier", mode: "insensitive" } },
          { classification: "INDEPENDENT_CONTRACTOR" },
        ],
      },
    }),
    prisma.application.count({
      where: {
        status: {
          in: [
            "SUBMITTED",
            "UNDER_REVIEW",
            "INTERVIEW_REQUESTED",
            "INTERVIEW_SCHEDULED",
            "CONDITIONAL_OFFER",
            "BACKGROUND_SCREENING",
            "ONBOARDING",
          ],
        },
      },
    }),
    prisma.application.count({
      where: {
        submittedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.jobOpening.count({ where: { status: "PUBLISHED" } }),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.customer.count({
      where: { status: { in: ["PROSPECT", "LEAD", "PROPOSAL_SENT", "NEGOTIATION"] } },
    }),
    prisma.contract.count({ where: { status: "ACTIVE" } }),
    prisma.contract.count({
      where: {
        status: { in: ["ACTIVE", "EXPIRING"] },
        expirationDate: { lte: expiringBefore, gte: new Date() },
      },
    }),
    prisma.contract.count({
      where: {
        status: { in: ["DRAFT", "UNDER_REVIEW", "SENT", "NEGOTIATING", "AWAITING_SIGNATURE"] },
      },
    }),
    prisma.managedDocument.count({
      where: {
        status: { in: ["CURRENT", "EXPIRING_SOON"] },
        expirationDate: { lte: expiringBefore, gte: new Date() },
      },
    }),
    prisma.complianceRecord.count({
      where: { status: { in: ["EXPIRED", "MISSING", "EXPIRING_SOON"] } },
    }),
    prisma.employeeTraining.count({
      where: {
        expiresAt: { lte: expiringBefore, gte: new Date() },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        targetType: true,
        createdAt: true,
        actorEmail: true,
      },
    }),
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
  };
}
