import { prisma } from "@/lib/db";
import { runDocumentNotificationScheduler } from "@/lib/documents/notification-scheduler";
import { getSetting } from "@/lib/settings";

export async function createExpirationNotifications(now = new Date()) {
  const settings = await getSetting("notifications", { contractExpirationDays: [90, 60, 30, 14, 7] });
  const days = settings.contractExpirationDays;
  const owners = await prisma.userRole.findMany({
    where: { role: { key: "OWNER" } },
    select: { userId: true },
  });

  const created: string[] = [];

  for (const day of days) {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() + day);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const contracts = await prisma.contract.findMany({
      where: { expirationDate: { gte: start, lt: end }, status: { in: ["ACTIVE", "EXPIRING"] } },
      include: { customer: true },
    });

    for (const contract of contracts) {
      for (const owner of owners) {
        const dedupeKey = `contract:${contract.id}:user:${owner.userId}:type:CONTRACT_EXPIRING:threshold:${day}d`;
        const existing = await prisma.notification.findUnique({ where: { dedupeKey } });
        if (existing) continue;
        try {
          await prisma.notification.create({
            data: {
              userId: owner.userId,
              type: "CONTRACT_EXPIRING",
              title: `Contract expiring in ${day} days`,
              body: `${contract.contractNumber} for ${contract.customer.legalName}`,
              href: "/dashboard/contracts",
              dedupeKey,
              thresholdKey: `${day}d`,
              emailStatus: "SUPPRESSED",
            },
          });
          created.push(contract.id);
        } catch (error) {
          if (error && typeof error === "object" && "code" in error && error.code === "P2002") continue;
          throw error;
        }
      }
    }
  }

  const documents = await runDocumentNotificationScheduler({ now });
  return { created: created.length, documents };
}
