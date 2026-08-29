import { MapPin } from "lucide-react";
import { Container } from "@/components/Container";
import { Reveal } from "@/components/marketing/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { addressLines, communities, site } from "@/lib/site";

function ServiceMap() {
  return (
    <svg
      viewBox="0 0 420 360"
      className="h-full w-full"
      role="img"
      aria-label="Central Ohio service area centered on Columbus"
    >
      <rect width="420" height="360" rx="24" fill="#07090b" />
      <g opacity="0.2" stroke="#1a6fb5" strokeWidth="0.7">
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`v-${i}`} x1={20 + i * 40} y1="16" x2={20 + i * 40} y2="344" />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h-${i}`} x1="16" y1={24 + i * 42} x2="404" y2={24 + i * 42} />
        ))}
      </g>
      <circle cx="210" cy="185" r="128" fill="none" stroke="#1a6fb5" strokeOpacity="0.25" className="mkt-pulse" />
      <circle cx="210" cy="185" r="88" fill="#0c1117" stroke="#1a6fb5" strokeOpacity="0.45" />
      <circle cx="210" cy="185" r="48" fill="#1a6fb5" fillOpacity="0.28" />
      <circle cx="210" cy="185" r="8" fill="#e8eef3" />
      <path d="M210 185 L210 148" stroke="#7ec8f2" strokeWidth="3" />
      <circle cx="210" cy="142" r="7" fill="#7ec8f2" className="mkt-glow-node" />
      <text x="210" y="122" textAnchor="middle" fill="#e8eef3" fontSize="13" fontWeight="700">
        Columbus
      </text>
      <text x="210" y="318" textAnchor="middle" fill="#9aa8b5" fontSize="11">
        Central Ohio service area
      </text>
    </svg>
  );
}

export function ServiceArea() {
  return (
    <section id="service-area" className="section-anchor bg-charcoal py-24">
      <Container>
        <Reveal>
          <SectionHeading
            light
            eyebrow="Service Area"
            title="Serving Columbus & Central Ohio"
            description="Safeway Couriers is based in Columbus, Ohio and serves healthcare organizations throughout Columbus and surrounding Central Ohio communities."
          />
        </Reveal>
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <ServiceMap />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <p className="flex items-start gap-2 text-mist">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-medical-bright" aria-hidden="true" />
              <span>
                <strong className="block">{site.name}</strong>
                {addressLines[0]}
                <br />
                {addressLines[1]}
              </span>
            </p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-medical-bright">
              Communities we serve
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {communities.map((city) => (
                <li
                  key={city}
                  className="rounded-full border border-white/10 bg-void px-3 py-1.5 text-sm font-medium text-mist"
                >
                  {city}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
