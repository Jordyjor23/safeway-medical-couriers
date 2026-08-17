import Link from "next/link";
import { credentials, services, site, steps } from "@/lib/site";

function RouteMark() {
  return (
    <svg
      viewBox="0 0 520 420"
      className="h-full w-full"
      aria-hidden="true"
    >
      <rect width="520" height="420" rx="28" fill="#06182c" />
      <g opacity="0.25" stroke="#14b8a6" strokeWidth="1">
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={40 + i * 48} x2="520" y2={40 + i * 48} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`v${i}`} x1={28 + i * 52} y1="0" x2={28 + i * 52} y2="420" />
        ))}
      </g>
      <path
        d="M70 320 C140 300 150 180 230 170 S340 240 390 150"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="70" cy="320" r="10" fill="#b8923a" />
      <circle cx="230" cy="170" r="8" fill="#14b8a6" />
      <circle cx="390" cy="150" r="12" fill="#ffffff" />
      <circle cx="390" cy="150" r="6" fill="#0a2540" />
      <text x="56" y="350" fill="#ffffff" fontSize="12" opacity="0.7">
        Pickup
      </text>
      <text x="368" y="128" fill="#ffffff" fontSize="12" opacity="0.7">
        Lab
      </text>
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-bright">
              24/7 medical logistics
            </p>
            <h1 className="display mt-4 text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Specimens and STAT deliveries, handled like they belong to a patient.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              {site.name} moves time-critical medical cargo for hospitals,
              laboratories, pharmacies, and clinics — with chain-of-custody
              control, GPS visibility, and HIPAA-trained couriers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/quote"
                className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal-bright hover:text-navy"
              >
                Request a quote
              </Link>
              <Link
                href="/tracking"
                className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:border-white hover:bg-white/5"
              >
                Track a shipment
              </Link>
            </div>
            <p className="mt-6 text-sm text-white/60">
              STAT desk:{" "}
              <a href={site.phoneHref} className="font-semibold text-white">
                {site.phone}
              </a>
            </p>
          </div>
          <div className="relative min-h-[280px]">
            <RouteMark />
          </div>
        </div>
        <div className="border-t border-white/10">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:px-6">
            {[
              ["24/7/365", "Live dispatch"],
              ["STAT", "On-demand pickup"],
              ["HIPAA", "Trained couriers"],
              ["GPS", "Proof of delivery"],
            ].map(([stat, label]) => (
              <div key={label}>
                <dt className="display text-2xl text-white sm:text-3xl">{stat}</dt>
                <dd className="mt-1 text-sm text-white/60">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-navy/10 bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted sm:px-6">
          <span>Trusted by</span>
          {["Hospitals", "Reference labs", "Pharmacies", "Surgery centers", "Biotech"].map(
            (item) => (
              <span key={item} className="text-navy/70">
                {item}
              </span>
            ),
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal">
          What we move
        </p>
        <h2 className="display mt-3 max-w-2xl text-3xl text-navy sm:text-4xl">
          Courier work built for healthcare, not parcel shipping.
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group rounded-2xl border border-navy/10 bg-paper p-6 transition hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-navy group-hover:text-teal">
                {service.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{service.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-bright">
            How a run works
          </p>
          <h2 className="display mt-3 max-w-2xl text-3xl sm:text-4xl">
            From the floor to the receiving bench, with a paper trail.
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.n}>
                <p className="display text-3xl text-gold">{step.n}</p>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal">
              Why Safeway
            </p>
            <h2 className="display mt-3 text-3xl text-navy sm:text-4xl">
              The difference is what happens when something is late — or fragile.
            </h2>
            <p className="mt-5 text-muted leading-relaxed">
              General couriers optimize for volume. Medical work fails on
              temperature, labeling, and handoff. Our drivers are trained for
              biohazard protocol, hospital check-in, and chain of custody — and
              dispatch stays on the ticket until delivery is confirmed.
            </p>
            <Link
              href="/compliance"
              className="mt-6 inline-flex text-sm font-semibold text-teal hover:text-navy"
            >
              Read compliance standards →
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {credentials.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-navy/10 bg-paper px-4 py-4 text-sm font-semibold text-navy"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-teal px-4 py-16 text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="display text-3xl sm:text-4xl">Need a courier in the next hour?</h2>
            <p className="mt-2 text-white/80">
              Call the STAT desk or send a request. Dispatch is staffed around the clock.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={site.phoneHref}
              className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
            >
              Call {site.phone}
            </a>
            <Link
              href="/quote"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-navy hover:bg-cream"
            >
              Request a quote
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
