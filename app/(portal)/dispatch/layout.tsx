import { RoleShell } from "@/components/portal/RoleShell";
import { requirePortal } from "@/lib/rbac";

export default async function DispatchLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal("dispatch");
  return (
    <RoleShell
      title="Dispatch"
      userName={ctx.user.name}
      links={[{ href: "/dispatch/dashboard", label: "Board" }]}
    >
      {children}
    </RoleShell>
  );
}
