"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const exactParents: Record<string, { href: string; label: string }> = {
  "/dashboard/applicants": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/audit": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/compliance": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/contracts": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/customers": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/documents": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/employees": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/jobs": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/notifications": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/payroll": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/roles": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/security": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/settings": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/users": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/workforce": { href: "/dashboard", label: "Dashboard" },
  "/dashboard/jobs/new": { href: "/dashboard/jobs", label: "Job postings" },
  "/dashboard/documents/alerts": { href: "/dashboard/documents", label: "Documents" },
  "/dashboard/documents/review": { href: "/dashboard/documents", label: "Documents" },
};

export function PortalBackNav() {
  const pathname = usePathname();

  let parent = exactParents[pathname];

  if (!parent && pathname.startsWith("/dashboard/documents/")) {
    parent = { href: "/dashboard/documents", label: "Documents" };
  }

  if (!parent && pathname.startsWith("/dashboard/deliveries/")) {
    parent = { href: "/dashboard", label: "Dashboard" };
  }

  if (!parent) return null;

  return (
    <div className="mb-4">
      <Link
        href={parent.href}
        className="inline-flex items-center gap-1 text-sm font-semibold text-medical hover:underline"
      >
        <span aria-hidden="true">←</span>
        {parent.label}
      </Link>
    </div>
  );
}
