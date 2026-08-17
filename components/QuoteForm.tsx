"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  frequencyOptions,
  organizationTypes,
  serviceNeededOptions,
} from "@/lib/site";
import { submitQuoteRequest } from "@/lib/submit-quote";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

type Status = "idle" | "sent";

function QuoteFormFields() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("idle");
  const defaultService = useMemo(() => {
    return searchParams.get("reason") === "compliance"
      ? "Compliance Packet / Vendor Onboarding"
      : "Scheduled Route";
  }, [searchParams]);

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-medical/30 bg-paper p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">
          Request received
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-navy">Thank you.</h2>
        <p className="mt-3 text-muted leading-relaxed">
          We have your information and will follow up about service, routing, or
          a compliance packet. This form is ready to connect to email or your
          dispatch system when you go live.
        </p>
      </div>
    );
  }

  return (
    <form
      id="quote-form"
      className="rounded-2xl border border-line bg-paper p-6 shadow-sm sm:p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await submitQuoteRequest({
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          organization: String(form.get("organization") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          organizationType: String(form.get("organizationType") ?? ""),
          serviceNeeded: String(form.get("serviceNeeded") ?? ""),
          pickupCity: String(form.get("pickupCity") ?? ""),
          deliveryCity: String(form.get("deliveryCity") ?? ""),
          frequency: String(form.get("frequency") ?? ""),
          startDate: String(form.get("startDate") ?? ""),
          details: String(form.get("details") ?? ""),
        });
        setStatus("sent");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          First Name
          <input name="firstName" required autoComplete="given-name" className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Last Name
          <input name="lastName" required autoComplete="family-name" className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy sm:col-span-2">
          Company / Organization
          <input name="organization" required autoComplete="organization" className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Work Email
          <input name="email" type="email" required autoComplete="email" className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Phone Number
          <input name="phone" type="tel" required autoComplete="tel" className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Type of Organization
          <select name="organizationType" className={fieldClass} defaultValue={organizationTypes[0]}>
            {organizationTypes.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Service Needed
          <select name="serviceNeeded" className={fieldClass} defaultValue={defaultService}>
            {serviceNeededOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Pickup City
          <input name="pickupCity" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Delivery City
          <input name="deliveryCity" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Delivery Frequency
          <select name="frequency" className={fieldClass} defaultValue={frequencyOptions[0]}>
            {frequencyOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Preferred Start Date
          <input name="startDate" type="date" className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy sm:col-span-2">
          Additional Details
          <textarea name="details" rows={5} className={fieldClass} />
        </label>
      </div>
      <button
        type="submit"
        className="mt-6 w-full rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-medical sm:w-auto"
      >
        Request My Quote
      </button>
    </form>
  );
}

export function QuoteForm() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-ice" />}>
      <QuoteFormFields />
    </Suspense>
  );
}
