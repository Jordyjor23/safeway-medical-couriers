import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export async function createExpirationNotifications() {
  const settings = await getSetting("notifications", { contractExpirationDays: [90, 60, 30, 14, 7] });
  const days = settings.contractExpirationDays;
  const owners = await prisma.userRole.findMany({
    where: { role: { key: "OWNER" } },
    select: { userId: true },
  });

  const now = new Date();
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
        await prisma.notification.create({
          data: {
            userId: owner.userId,
            type: "CONTRACT_EXPIRING",
            title: `Contract expiring in ${day} days`,
            body: `${contract.contractNumber} for ${contract.customer.legalName}`,
            href: "/dashboard/contracts",
          },
        });
        created.push(contract.id);
      }
    }
  }

  const documents = await prisma.managedDocument.findMany({
    where: {
      expirationDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
      status: { in: ["CURRENT", "EXPIRING_SOON"] },
    },
  });
  for (const document of documents) {
    for (const owner of owners) {
      await prisma.notification.create({
        data: {
          userId: owner.userId,
          type: "DOCUMENT_EXPIRING",
          title: "Document expiring soon",
          body: document.name,
          href: "/dashboard/documents",
        },
      });
    }
  }

  return { created: created.length };
}
