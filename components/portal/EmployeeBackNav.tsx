"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function EmployeeBackNav() {
  const pathname = usePathname();
  if (pathname === "/employee/dashboard") return null;

  return (
    <div className="mb-4">
      <Link
        href="/employee/dashboard"
        className="inline-flex items-center gap-1 text-sm font-semibold text-medical hover:underline"
      >
        <span aria-hidden="true">←</span>
        Employee home
      </Link>
    </div>
  );
}
