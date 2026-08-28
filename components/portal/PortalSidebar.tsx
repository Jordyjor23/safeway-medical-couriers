"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  Building2,
  ClipboardCheck,
  FileText,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { SignOutButton } from "@/components/portal/SignOutButton";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
};

const items: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/applicants", label: "Applicants", permission: "applicants.view", icon: UserRound },
  { href: "/dashboard/jobs", label: "Job postings", permission: "jobs.view", icon: Briefcase },
  { href: "/dashboard/employees", label: "Employees", permission: "employees.view", icon: Users },
  { href: "/dashboard/customers", label: "Customers", permission: "customers.view", icon: Building2 },
  { href: "/dashboard/contracts", label: "Contracts", permission: "contracts.view", icon: FileText },
  { href: "/dashboard/documents", label: "Documents", permission: "documents.view", icon: ScrollText },
  { href: "/dashboard/compliance", label: "Compliance tracking", permission: "compliance.view", icon: ClipboardCheck },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/audit", label: "Audit log", permission: "audit.view", icon: Shield },
  { href: "/dashboard/users", label: "Users", permission: "users.manage", icon: Users },
  { href: "/dashboard/roles", label: "Roles & permissions", permission: "permission.manage", icon: Shield },
  { href: "/dashboard/settings", label: "Settings", permission: "settings.manage", icon: Settings },
  { href: "/dashboard/security", label: "Security", icon: KeyRound },
];

export function PortalSidebar({
  userName,
  userEmail,
  permissions,
}: {
  userName: string;
  userEmail: string;
  permissions: string[];
}) {
  const pathname = usePathname();
  const permissionSet = new Set(permissions);
  const visible = items.filter((item) => !item.permission || permissionSet.has(item.permission));

  return (
    <aside className="flex w-full flex-col bg-navy text-white lg:min-h-screen lg:w-64 lg:shrink-0">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
          Safeway Couriers
        </p>
        <p className="mt-1 text-sm font-semibold">Business portal</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Portal">
        {visible.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                active ? "bg-white/15 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4 text-sm">
        <p className="truncate text-white/90">{userName}</p>
        <p className="truncate text-xs text-white/50">{userEmail}</p>
        <div className="mt-3">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
