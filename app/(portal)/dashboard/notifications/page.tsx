import type { Metadata } from "next";
import Link from "next/link";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/(portal)/dashboard/notifications/actions";
import { EmptyState } from "@/components/portal/EmptyState";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold text-navy">Notifications</h1>
        {items.some((item) => !item.readAt) ? (
          <form action={markAllNotificationsRead}>
            <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy hover:border-medical">
              Mark all read
            </button>
          </form>
        ) : null}
      </div>
      {items.length === 0 ? (
        <EmptyState title="No notifications" body="Expiration alerts and recruiting notices will show here." />
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div>
                {item.href ? (
                  <Link href={item.href} className="font-medium text-navy hover:text-medical">
                    {item.title}
                  </Link>
                ) : (
                  <p className="font-medium text-navy">{item.title}</p>
                )}
                <p className="text-sm text-muted">{item.body}</p>
                {!item.readAt ? <p className="mt-1 text-xs font-semibold text-medical">Unread</p> : null}
              </div>
              {!item.readAt ? (
                <form action={markNotificationRead}>
                  <input type="hidden" name="id" value={item.id} />
                  <button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-medical">
                    Mark read
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
