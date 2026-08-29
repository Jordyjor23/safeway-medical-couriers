"use client";

import { useState } from "react";

const fieldClass = "mkt-field";

type Result = {
  trackingNumber: string;
  applicantName: string;
  position: string;
  submittedAt: string | null;
  statusLabel: string;
};

export function StatusLookupForm() {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  return (
    <div>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setResult(null);
          const form = new FormData(event.currentTarget);
          const tracking = encodeURIComponent(String(form.get("tracking") ?? ""));
          const email = encodeURIComponent(String(form.get("email") ?? ""));
          const response = await fetch(`/api/careers/applications?tracking=${tracking}&email=${email}`);
          const body = await response.json().catch(() => null);
          if (!response.ok) {
            setError(body?.error ?? "No matching application was found.");
            return;
          }
          setResult({
            trackingNumber: body.application.trackingNumber,
            applicantName: body.application.applicantName,
            position: body.application.position,
            submittedAt: body.application.submittedAt,
            statusLabel: body.application.statusLabel,
          });
        }}
      >
        <label className="text-sm font-semibold text-mist">
          Reference number
          <input name="tracking" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-mist">
          Email used on the application
          <input name="email" type="email" required className={fieldClass} />
        </label>
        <button type="submit" className="mkt-btn mkt-btn-primary sm:col-span-2 sm:w-fit">
          Check status
        </button>
      </form>
      {error ? (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-panel p-6">
          <p className="font-semibold text-mist">{result.applicantName}</p>
          <p className="text-sm text-mist-soft">{result.position}</p>
          <p className="mt-3 text-sm">Reference: {result.trackingNumber}</p>
          <p className="text-sm">Status: {result.statusLabel}</p>
        </div>
      ) : null}
    </div>
  );
}
