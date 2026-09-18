"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock3, Home, KeyRound, CalendarOff, WalletCards } from "lucide-react";
import { SignOutButton } from "@/components/portal/SignOutButton";

const items = [
  { href: "/employee/dashboard", label: "Home", icon: Home },
  { href: "/employee/schedule", label: "My schedule", icon: CalendarDays },
  { href: "/employee/timecards", label: "My timecards", icon: Clock3 },
  { href: "/employee/pay", label: "My pay", icon: WalletCards },
  { href: "/employee/time-off", label: "PTO & call-offs", icon: CalendarOff },
  { href: "/employee/security", label: "Security", icon: KeyRound },
];

export function EmployeeSidebar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-full flex-col bg-navy text-white lg:min-h-screen lg:w-64 lg:shrink-0">
      <div className="border-b border-white/10 px-5 py-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Safeway Couriers</p><p className="mt-1 text-sm font-semibold">Employee portal</p></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Employee portal">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return <Link key={item.href} href={item.href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? "bg-white/15 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}><item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{item.label}</Link>;
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4 text-sm"><p className="truncate text-white/90">{userName}</p><p className="truncate text-xs text-white/50">{userEmail}</p><div className="mt-3"><SignOutButton /></div></div>
    </aside>
  );
}
