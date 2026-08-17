"use client";

import { useState } from "react";
import { services, site } from "@/lib/site";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-ink outline-none ring-teal/30 transition focus:border-teal focus:ring-2";

export function QuoteForm() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-teal/30 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
          Request received
        </p>
        <h2 className="display mt-2 text-3xl text-navy">We have your details.</h2>
        <p className="mt-3 text-muted leading-relaxed">
          Dispatch will follow up shortly. For STAT pickup, call{" "}
          <a href={site.phoneHref} className="font-semibold text-navy underline">
            {site.phone}
          </a>{" "}
          so a courier can be assigned immediately.
        </p>
      </div>
    );
  }

  return (
    <form
      className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        setStatus("sent");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          Facility or company
          <input name="facility" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Contact name
          <input name="name" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Email
          <input name="email" type="email" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Phone
          <input name="phone" type="tel" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy sm:col-span-2">
          Service needed
          <select name="service" className={fieldClass} defaultValue={services[0].title}>
            {services.map((service) => (
              <option key={service.title}>{service.title}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Pickup location
          <input name="pickup" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Delivery location
          <input name="dropoff" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy sm:col-span-2">
          Timing
          <select name="timing" className={fieldClass} defaultValue="STAT — as soon as possible">
            <option>STAT — as soon as possible</option>
            <option>Same day</option>
            <option>Scheduled / recurring route</option>
            <option>Planning — not urgent</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-navy sm:col-span-2">
          Notes (temperature, biohazard, cutoff times)
          <textarea name="notes" rows={4} className={fieldClass} />
        </label>
      </div>
      <button
        type="submit"
        className="mt-6 w-full rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal sm:w-auto"
      >
        Submit request
      </button>
      <p className="mt-3 text-xs text-muted">
        This demo form does not send email yet. Call dispatch for live STAT runs.
      </p>
    </form>
  );
}
