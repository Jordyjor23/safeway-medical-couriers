import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/Container";
import { LogisticsNetwork } from "@/components/marketing/LogisticsNetwork";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-void text-mist">
      <div className="mkt-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(26,111,181,0.18),transparent_36%),radial-gradient(circle_at_90%_80%,rgba(11,28,51,0.9),transparent_42%)]" />
      <Container className="mkt-split relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24 xl:py-28">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
            Medical logistics platform · {site.region}
          </p>
          <h1 className="mt-5 max-w-[18ch] text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            {site.tagline}
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-mist-soft sm:text-lg">
            Reliable, secure, and time-sensitive medical courier services serving healthcare
            organizations throughout Columbus and Central Ohio.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/quote" className="mkt-btn mkt-btn-primary">
              Request a Quote
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/#services" className="mkt-btn mkt-btn-secondary">
              View Our Services
            </Link>
          </div>
        </div>
        <div className="mkt-float mx-auto w-full min-w-0 max-w-xl lg:max-w-none">
          <LogisticsNetwork />
        </div>
      </Container>
    </section>
  );
}
