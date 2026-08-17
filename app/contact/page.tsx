import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${site.name} dispatch for medical courier service.`,
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to dispatch — not a ticket queue."
        description="Call for STAT. Email or write for accounts, contracts, and coverage questions."
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-navy/10 bg-paper p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
              Phone
            </p>
            <a href={site.phoneHref} className="mt-2 block text-2xl font-semibold text-navy">
              {site.phone}
            </a>
          </div>
          <div className="rounded-2xl border border-navy/10 bg-paper p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
              Email
            </p>
            <a href={site.emailHref} className="mt-2 block text-xl font-semibold text-navy">
              {site.email}
            </a>
          </div>
          <div className="rounded-2xl border border-navy/10 bg-paper p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
              Hours
            </p>
            <p className="mt-2 text-lg font-semibold text-navy">{site.hours}</p>
          </div>
        </div>
        <ContactForm />
      </div>
    </>
  );
}
