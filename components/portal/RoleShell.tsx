import Link from "next/link";
import { SignOutButton } from "@/components/portal/SignOutButton";

export function RoleShell({
  title,
  userName,
  children,
  links,
}: {
  title: string;
  userName: string;
  children: React.ReactNode;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="min-h-full bg-ice">
      <header className="border-b border-line bg-navy text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Safeway Couriers</p>
            <p className="text-sm font-semibold">{title}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-white/80">{userName}</span>
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Portal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  );
}
