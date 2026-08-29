import { RoleShell } from "@/components/portal/RoleShell";
import { requirePortal } from "@/lib/rbac";

export default async function OperationsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal("operations");
  return (
    <RoleShell
      title="Operations"
      userName={ctx.user.name}
      links={[
        { href: "/operations/dashboard", label: "Overview" },
        { href: "/dispatch/dashboard", label: "Dispatch" },
        { href: "/operations/documents", label: "Documents" },
        { href: "/operations/documents/review", label: "Needs review" },
      ]}
    >
      {children}
    </RoleShell>
  );
}
