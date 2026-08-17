import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/Container";
import { site } from "@/lib/site";

function HeroVisual() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy-mid ring-1 ring-white/10">
      <svg viewBox="0 0 640 520" className="h-full w-full" aria-hidden="true">
        <rect width="640" height="520" fill="#143056" />
        <path d="M0 390h640v130H0z" fill="#0b1c33" />
        <g fill="#1c3f6c">
          <rect x="48" y="210" width="90" height="180" rx="4" />
          <rect x="150" y="160" width="70" height="230" rx="4" />
          <rect x="232" y="190" width="110" height="200" rx="4" />
          <rect x="480" y="175" width="96" height="215" rx="4" />
        </g>
        <rect x="360" y="120" width="150" height="270" rx="6" fill="#1a6fb5" />
        <rect x="378" y="145" width="28" height="22" rx="2" fill="#9fd4f5" opacity="0.7" />
        <rect x="416" y="145" width="28" height="22" rx="2" fill="#9fd4f5" opacity="0.7" />
        <rect x="454" y="145" width="28" height="22" rx="2" fill="#9fd4f5" opacity="0.7" />
        <rect x="378" y="180" width="28" height="22" rx="2" fill="#9fd4f5" opacity="0.45" />
        <rect x="416" y="180" width="28" height="22" rx="2" fill="#9fd4f5" opacity="0.45" />
        <rect x="454" y="180" width="28" height="22" rx="2" fill="#9fd4f5" opacity="0.45" />
        <rect x="420" y="330" width="30" height="60" rx="2" fill="#0b1c33" />
        <circle cx="168" cy="392" r="54" fill="#0b1c33" />
        <rect x="120" y="360" width="170" height="48" rx="10" fill="#2b86d1" />
        <rect x="128" y="368" width="42" height="32" rx="6" fill="#7ec8f2" />
        <circle cx="168" cy="408" r="16" fill="#071424" />
        <circle cx="258" cy="408" r="16" fill="#071424" />
        <circle cx="168" cy="408" r="7" fill="#d7e3ef" />
        <circle cx="258" cy="408" r="7" fill="#d7e3ef" />
        <rect x="300" y="348" width="44" height="36" rx="6" fill="#ffffff" />
        <path d="M311 366h22M322 355v22" stroke="#1a6fb5" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M80 430 C180 410 240 450 340 420 S500 390 590 410"
          fill="none"
          stroke="#7ec8f2"
          strokeWidth="3"
          strokeDasharray="8 10"
          opacity="0.8"
        />
      </svg>
      <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-navy/80 px-4 py-3 text-sm text-white backdrop-blur-sm">
        Time-sensitive medical transport across Columbus & Central Ohio
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="bg-navy text-white">
      <Container className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
            Medical courier services · {site.region}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
            {site.tagline}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            Reliable, secure, and time-sensitive medical courier services serving
            healthcare organizations throughout Columbus and Central Ohio.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="inline-flex items-center gap-2 rounded-full bg-medical px-5 py-3 text-sm font-semibold text-white transition hover:bg-medical-bright"
            >
              Request a Quote
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/#services"
              className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/5"
            >
              View Our Services
            </Link>
          </div>
        </div>
        <HeroVisual />
      </Container>
    </section>
  );
}
