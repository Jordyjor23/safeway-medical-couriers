"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav } from "@/lib/site";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled || open
          ? "border-white/10 bg-void/80 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center rounded-md bg-white px-2 py-1.5" onClick={() => setOpen(false)}>
          <Image
            src="/safeway-logo.png"
            alt="Safeway Couriers"
            width={260}
            height={87}
            priority
            className="h-auto w-[150px] sm:w-[180px] lg:w-[196px]"
          />
        </Link>

        <nav className="hidden items-center gap-5 xl:flex" aria-label="Primary">
          {nav.map((item) => {
            const active = item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-[0.78rem] font-semibold tracking-wide transition-colors ${
                  active ? "text-mist" : "text-mist-soft hover:text-mist"
                }`}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-0 -bottom-2 h-px bg-medical" aria-hidden="true" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/quote" className="mkt-btn mkt-btn-primary !px-3 !py-2 text-xs sm:!px-4 sm:text-sm">
            Request a Quote
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 text-mist xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 bottom-0 top-[4.25rem] z-40 overflow-y-auto bg-void/95 px-4 py-6 backdrop-blur-xl xl:hidden"
        >
          <nav className="mx-auto flex max-w-lg flex-col gap-1" aria-label="Mobile">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-4 py-3.5 text-lg font-semibold text-mist transition hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/quote"
              className="mkt-btn mkt-btn-primary mt-4 w-full py-3.5"
              onClick={() => setOpen(false)}
            >
              Request a Quote
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
