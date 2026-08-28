import { RoleShell } from "@/components/portal/RoleShell";
import { requirePortal } from "@/lib/rbac";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal("driver");
  return (
    <RoleShell
      title="Driver"
      userName={ctx.user.name}
      links={[
        { href: "/driver/dashboard", label: "Assignments" },
        { href: "/employee/dashboard", label: "My profile" },
      ]}
    >
      {children}
    </RoleShell>
  );
}
