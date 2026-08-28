import { RoleShell } from "@/components/portal/RoleShell";
import { requirePortal } from "@/lib/rbac";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal("customer");
  return (
    <RoleShell
      title="Customer portal"
      userName={ctx.user.name}
      links={[{ href: "/customer/dashboard", label: "Shipments" }]}
    >
      {children}
    </RoleShell>
  );
}
