import Link from "next/link";
import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";
import { addressLines, footerNav, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="bg-navy-deep text-white">
      <Container className="grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link href="/" className="inline-block">
            <Logo inverted />
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            Professional medical courier and healthcare logistics services serving
            Columbus and Central Ohio.
          </p>
          <p className="mt-4 text-sm text-white/60">
            {addressLines[0]}
            <br />
            {addressLines[1]}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
            Explore
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {footerNav.slice(0, 7).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/75 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
            Company
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {footerNav.slice(7).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/75 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="text-white/60">Phone: {site.phone}</li>
            <li className="text-white/60">Email: {site.email}</li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="py-5 text-xs text-white/45">
          © {site.year} {site.legalName}. All Rights Reserved.
        </Container>
      </div>
    </footer>
  );
}
