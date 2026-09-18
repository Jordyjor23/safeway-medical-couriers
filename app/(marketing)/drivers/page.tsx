import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Driver Applications",
  description:
    "Safeway Couriers is accepting Medical Courier and Independent Courier Partner applications for upcoming routes in Columbus and Central Ohio.",
  alternates: { canonical: "/drivers" },
  openGraph: {
    title: "Now Accepting Driver Applications | Safeway Couriers",
    description:
      "Apply to join Safeway Couriers' driver network for upcoming medical courier and independent contractor routes in Columbus and Central Ohio.",
    url: "/drivers",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Now Accepting Driver Applications | Safeway Couriers",
    description:
      "Medical Courier and Independent Courier Partner applications are now open.",
  },
};

export default function DriversPage() {
  return (
    <main className="flex-1 bg-void text-mist">
      <section className="relative overflow-hidden">
        <div className="mkt-grid pointer-events-none absolute inset-0 opacity-30" />
        <Container className="relative py-16 sm:py-20 lg:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
            Safeway Couriers · Columbus & Central Ohio
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Now Accepting Driver Applications
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-mist-soft sm:text-lg">
            We are building our driver network now for upcoming routes and contracts. Apply for the path that fits you best.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-graphite p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-300">Employment</p>
              <h2 className="mt-3 text-2xl font-semibold">Medical Courier</h2>
              <p className="mt-3 text-sm leading-relaxed text-mist-soft">
                Apply for employee medical courier opportunities supporting healthcare and time-sensitive deliveries.
              </p>
              <Link
                className="mkt-btn mkt-btn-primary mt-6"
                href="/careers/apply/evergreen-medical-courier"
              >
                Apply as a Medical Courier
              </Link>
            </article>

            <article className="rounded-3xl border border-white/10 bg-graphite p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-300">Independent contractor</p>
              <h2 className="mt-3 text-2xl font-semibold">Independent Courier Partner</h2>
              <p className="mt-3 text-sm leading-relaxed text-mist-soft">
                Apply for independent contractor route opportunities as assignments and contracts become available.
              </p>
              <Link
                className="mkt-btn mkt-btn-primary mt-6"
                href="/careers/apply/evergreen-independent-courier-partner"
              >
                Apply as an Independent Courier
              </Link>
            </article>
          </div>

          <p className="mt-8 max-w-3xl text-sm leading-relaxed text-mist-soft">
            Applications are accepted in advance for consideration as routes and contracts become available. Submission does not guarantee immediate work, employment, or an assignment.
          </p>

          <div className="mt-8">
            <Link className="mkt-btn mkt-btn-secondary" href="/careers">
              View all career opportunities
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}
