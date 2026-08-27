import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/EmptyState";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await requireAuth();
  const items = await prisma.notification.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Notifications</h1>
      {items.length === 0 ? (
        <EmptyState title="No notifications" body="Expiration alerts and recruiting notices will show here." />
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <p className="font-medium text-navy">{item.title}</p>
              <p className="text-sm text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
