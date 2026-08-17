import Link from "next/link";
import { Logo } from "@/components/Logo";
import { nav, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="bg-navy-deep text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link href="/" className="inline-block">
            <Logo inverted />
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            HIPAA-trained medical couriers for hospitals, laboratories, pharmacies,
            and clinics. STAT when it is urgent. Scheduled when it has to be
            reliable.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-bright">
            Company
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/75 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/quote" className="text-white/75 hover:text-white">
                Request a quote
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-bright">
            Dispatch
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            <li>
              <a href={site.phoneHref} className="hover:text-white">
                {site.phone}
              </a>
            </li>
            <li>
              <a href={site.emailHref} className="hover:text-white">
                {site.email}
              </a>
            </li>
            <li>{site.hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/45 sm:px-6">
          © {new Date().getFullYear()} {site.name}. HIPAA-trained medical courier
          service. Chain-of-custody transport for hospitals, laboratories, and
          pharmacies.
        </p>
      </div>
    </footer>
  );
}
