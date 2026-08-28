import { RoleShell } from "@/components/portal/RoleShell";
import { requirePortal } from "@/lib/rbac";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal("employee");
  return (
    <RoleShell
      title="Employee"
      userName={ctx.user.name}
      links={[{ href: "/employee/dashboard", label: "My portal" }]}
    >
      {children}
    </RoleShell>
  );
}
