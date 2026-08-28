export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { requirePortal } from "@/lib/rbac";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal("staff");

  return (
    <div className="min-h-full bg-ice lg:flex">
      <PortalSidebar
        userName={ctx.user.name}
        userEmail={ctx.user.email}
        permissions={[...ctx.permissions]}
      />
      <div className="flex-1">
        <div className="border-b border-line bg-paper px-4 py-3 lg:hidden">
          <p className="text-sm font-semibold text-navy">Safeway Couriers portal</p>
        </div>
        <div className="px-4 py-6 sm:px-6 lg:px-10">{children}</div>
      </div>
    </div>
  );
}
