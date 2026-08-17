import { MapPin } from "lucide-react";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { addressLines, communities, site } from "@/lib/site";

function ServiceMap() {
  return (
    <svg viewBox="0 0 420 360" className="h-full w-full" role="img" aria-label="Central Ohio service area centered on Columbus">
      <rect width="420" height="360" rx="24" fill="#0b1c33" />
      <circle cx="210" cy="185" r="128" fill="#143056" />
      <circle cx="210" cy="185" r="88" fill="#1a4a7a" />
      <circle cx="210" cy="185" r="48" fill="#1a6fb5" />
      <circle cx="210" cy="185" r="10" fill="#ffffff" />
      <path d="M210 185 L210 148" stroke="#7ec8f2" strokeWidth="3" />
      <circle cx="210" cy="142" r="8" fill="#7ec8f2" />
      <text x="210" y="122" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">
        Columbus
      </text>
      <text x="210" y="318" textAnchor="middle" fill="#9fd4f5" fontSize="11">
        Central Ohio service area
      </text>
    </svg>
  );
}

export function ServiceArea() {
  return (
    <section id="service-area" className="section-anchor bg-paper py-20">
      <Container>
        <SectionHeading
          eyebrow="Service Area"
          title="Serving Columbus & Central Ohio"
          description="Safeway Couriers is based in Columbus, Ohio and serves healthcare organizations throughout Columbus and surrounding Central Ohio communities."
        />
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl">
            <ServiceMap />
          </div>
          <div>
            <p className="flex items-start gap-2 text-navy">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-medical" aria-hidden="true" />
              <span>
                <strong className="block">{site.name}</strong>
                {addressLines[0]}
                <br />
                {addressLines[1]}
              </span>
            </p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-medical">
              Communities we serve
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {communities.map((city) => (
                <li
                  key={city}
                  className="rounded-full border border-line bg-ice px-3 py-1.5 text-sm font-medium text-navy"
                >
                  {city}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
