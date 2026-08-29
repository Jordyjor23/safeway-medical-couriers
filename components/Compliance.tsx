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
import { Reveal } from "@/components/marketing/Reveal";
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
    <section id="compliance" className="section-anchor relative overflow-hidden bg-navy-deep py-24 text-mist">
      <div className="mkt-grid pointer-events-none absolute inset-0 opacity-25" />
      <Container className="relative">
        {showHeading ? (
          <Reveal>
            <SectionHeading
              light
              eyebrow="Training & Safety"
              title="Healthcare Logistics Built Around Safety & Compliance"
              description="Safeway Couriers will launch only after the company and applicable couriers have completed the required training, policies, procedures, and operational safeguards for the medical courier services being offered."
            />
          </Reveal>
        ) : null}

        <p className={`max-w-3xl text-sm leading-relaxed text-sky-100/80 ${showHeading ? "mt-6" : ""}`}>
          The items below describe internal training programs, operational procedures, and
          documentation practices. They are not third-party certifications unless a credential is
          named separately.
        </p>

        <ul className="mt-8 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <li
              key={badge.key}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-sky-100"
            >
              {badge.label}
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {complianceItems.map((item, index) => {
            const Icon = icons[item.key];
            return (
              <Reveal key={item.key} delay={index * 45}>
                <article className="h-full rounded-2xl border border-white/10 bg-white/5 p-6">
                  <Icon className="h-5 w-5 text-sky-300" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{item.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-void/70 p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-white/80 sm:text-base">
              Safeway Couriers is committed to operating in accordance with applicable federal,
              state, and client-specific requirements governing medical courier transportation. Our
              compliance program incorporates healthcare privacy safeguards, bloodborne pathogen
              safety procedures, medical specimen handling protocols, chain-of-custody documentation,
              and applicable transportation requirements.
            </p>
            <p className="text-sm leading-relaxed text-sky-100 sm:text-base">
              Compliance documentation, training records, insurance documentation, and operational
              procedures are available to qualified contracting organizations upon request.
            </p>
            <Link href="/quote?reason=compliance" className="mkt-btn mkt-btn-primary">
              Request Our Compliance Packet
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
