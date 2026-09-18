export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { PortalBackNav } from "@/components/portal/PortalBackNav";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { requirePortal } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal("staff");
  const unreadNotifications = await prisma.notification.count({
    where: { userId: ctx.user.id, readAt: null },
  });

  return (
    <div className="min-h-full bg-ice lg:flex">
      <PortalSidebar
        userName={ctx.user.name}
        userEmail={ctx.user.email}
        permissions={[...ctx.permissions]}
        unreadNotifications={unreadNotifications}
      />
      <div className="flex-1">
        <div className="border-b border-line bg-paper px-4 py-3 lg:hidden">
          <p className="text-sm font-semibold text-navy">Safeway Couriers portal</p>
        </div>
        <div className="px-4 py-6 sm:px-6 lg:px-10">
          <PortalBackNav />
          {children}
        </div>
      </div>
    </div>
  );
}
