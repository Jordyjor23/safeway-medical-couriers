import { RoleShell } from "@/components/portal/RoleShell";
import { requirePortal } from "@/lib/rbac";

export default async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal("applicant");
  return (
    <RoleShell
      title="Applicant"
      userName={ctx.user.name}
      links={[
        { href: "/applicant/dashboard", label: "My applications" },
        { href: "/careers", label: "Open jobs" },
      ]}
    >
      {children}
    </RoleShell>
  );
}
