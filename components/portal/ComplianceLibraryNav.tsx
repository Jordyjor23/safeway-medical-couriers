import Link from "next/link";

const LINKS = [
  { href: "/dashboard/compliance/library", label: "Master source files" },
  { href: "/dashboard/compliance/register", label: "Controlled register" },
  { href: "/dashboard/compliance/forms", label: "Forms register" },
  { href: "/dashboard/compliance/tasks", label: "Implementation tasks" },
  { href: "/dashboard/compliance/matrix", label: "Service authorization" },
];

export function ComplianceLibraryNav({ current }: { current: string }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-3 text-sm" aria-label="Compliance library">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`font-semibold hover:underline ${current === link.href ? "text-navy" : "text-medical"}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
