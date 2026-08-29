import { RoleShell } from "@/components/portal/RoleShell";
import { requirePortal } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal("admin");
  return (
    <RoleShell
      title="Admin portal"
      userName={ctx.user.name}
      links={[
        { href: "/admin/dashboard", label: "Overview" },
        { href: "/dashboard/employees", label: "Employees" },
        { href: "/dashboard/customers", label: "Customers" },
        { href: "/dashboard/contracts", label: "Contracts" },
        { href: "/dashboard/documents", label: "Documents" },
        { href: "/dashboard/documents/alerts", label: "Document alerts" },
        { href: "/dashboard/compliance", label: "Compliance" },
      ]}
    >
      {children}
    </RoleShell>
  );
}
