import {
  BadgeCheck,
  Biohazard,
  BookOpenCheck,
  ClipboardCheck,
  Droplets,
  FileLock,
  FlaskConical,
  Shield,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { complianceItems, visibleTrustBadges } from "@/lib/site";

const icons = {
  hipaa: Shield,
  osha: Biohazard,
  dot: Truck,
  un3373: FlaskConical,
  custody: ClipboardCheck,
  handling: Droplets,
  privacy: FileLock,
  spill: BadgeCheck,
  records: BookOpenCheck,
};

export function Compliance({ showHeading = true }: { showHeading?: boolean }) {
  const badges = visibleTrustBadges();

  return (
    <section id="compliance" className="section-anchor bg-navy py-20 text-white">
      <Container>
        {showHeading ? (
          <SectionHeading
            light
            eyebrow="Training & Safety"
            title="Healthcare Logistics Built Around Safety & Compliance"
            description="Safeway Couriers will launch only after the company and applicable couriers have completed the required training, policies, procedures, and operational safeguards for the medical courier services being offered."
          />
        ) : null}

        <ul className="mt-8 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <li
              key={badge.key}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-sky-100"
            >
              {badge.label}
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {complianceItems.map((item) => {
            const Icon = icons[item.key];
            return (
              <article
                key={item.key}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <Icon className="h-5 w-5 text-sky-300" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{item.body}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 space-y-4 rounded-2xl bg-navy-deep p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-white/80 sm:text-base">
            Safeway Couriers is committed to operating in accordance with
            applicable federal, state, and client-specific requirements governing
            medical courier transportation. Our compliance program incorporates
            healthcare privacy safeguards, bloodborne pathogen safety procedures,
            medical specimen handling protocols, chain-of-custody documentation,
            and applicable transportation requirements.
          </p>
          <p className="text-sm leading-relaxed text-sky-100 sm:text-base">
            Compliance documentation, training records, insurance documentation,
            and operational procedures are available to qualified contracting
            organizations upon request.
          </p>
          <Link
            href="/quote?reason=compliance"
            className="inline-flex rounded-full bg-medical px-5 py-3 text-sm font-semibold text-white transition hover:bg-medical-bright"
          >
            Request Our Compliance Packet
          </Link>
        </div>
      </Container>
    </section>
  );
}
