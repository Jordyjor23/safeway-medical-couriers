import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/Container";
import { addressLines, footerCompany, footerExplore, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-void text-mist">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-medical to-transparent" />
      <Container className="grid gap-10 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link href="/" className="inline-flex items-center rounded-lg bg-white px-2 py-1.5">
            <Image
              src="/safeway-logo.png"
              alt="Safeway Couriers"
              width={260}
              height={87}
              className="h-auto w-[160px]"
            />
          </Link>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-mist-soft">
            Technology-enabled medical logistics for healthcare organizations across Columbus and
            Central Ohio.
          </p>
          <p className="mt-4 text-sm text-mist-soft">
            {addressLines[0]}
            <br />
            {addressLines[1]}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Explore</p>
          <ul className="mt-4 space-y-2 text-sm">
            {footerExplore.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group inline-flex items-center gap-1 text-mist-soft transition hover:text-mist"
                >
                  {item.label}
                  <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Company</p>
          <ul className="mt-4 space-y-2 text-sm">
            {footerCompany.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group inline-flex items-center gap-1 text-mist-soft transition hover:text-mist"
                >
                  {item.label}
                  <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                </Link>
              </li>
            ))}
            <li className="pt-2 text-mist-soft">Phone: {site.phone}</li>
            <li className="text-mist-soft">Email: {site.email}</li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="py-5 text-xs text-mist-soft/80">
          © {site.year} {site.legalName}. All Rights Reserved.
        </Container>
      </div>
    </footer>
  );
}
