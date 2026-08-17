import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { QuoteForm } from "@/components/QuoteForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Request a quote",
  description: "Request STAT or scheduled medical courier service from Safeway Couriers.",
};

export default function QuotePage() {
  return (
    <>
      <PageHero
        eyebrow="Request a quote"
        title="Tell us what is moving and when it has to arrive."
        description="For STAT pickup, call dispatch first. Use this form for account setup, recurring routes, and non-emergency runs."
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.7fr]">
        <QuoteForm />
        <aside className="h-fit rounded-2xl bg-navy p-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-bright">
            STAT desk
          </p>
          <p className="display mt-3 text-3xl">{site.phone}</p>
          <p className="mt-3 text-sm text-white/70">{site.hours}</p>
          <p className="mt-6 text-sm text-white/70">
            Have the pickup department, receiving lab, temperature requirement,
            and any biohazard notes ready when you call.
          </p>
        </aside>
      </div>
    </>
  );
}
