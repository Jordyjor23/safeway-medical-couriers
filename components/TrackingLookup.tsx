"use client";

import { useState } from "react";

const demos: Record<
  string,
  { status: string; from: string; to: string; steps: { label: string; time: string; done: boolean }[] }
> = {
  "SW-10482": {
    status: "In transit",
    from: "Northside Draw Station",
    to: "Central Reference Lab, Receiving Dock B",
    steps: [
      { label: "Request accepted", time: "06:12", done: true },
      { label: "Picked up — cooler sealed", time: "06:41", done: true },
      { label: "In transit", time: "06:48", done: true },
      { label: "Delivered with signature", time: "ETA 07:15", done: false },
    ],
  },
  "SW-22901": {
    status: "Delivered",
    from: "Memorial Hospital Pharmacy",
    to: "Westside Infusion Suite",
    steps: [
      { label: "Request accepted", time: "14:02", done: true },
      { label: "Picked up", time: "14:28", done: true },
      { label: "Delivered — signed by charge nurse", time: "14:51", done: true },
    ],
  },
};

export function TrackingLookup() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<(typeof demos)[string] | "missing" | null>(null);

  return (
    <div>
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const key = query.trim().toUpperCase();
          setResult(demos[key] ?? "missing");
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Enter tracking ID (try SW-10482)"
          className="w-full rounded-lg border border-navy/15 bg-white px-4 py-3 text-sm outline-none ring-teal/30 focus:border-teal focus:ring-2"
          aria-label="Tracking ID"
        />
        <button
          type="submit"
          className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-teal"
        >
          Track
        </button>
      </form>

      {result === "missing" ? (
        <p className="mt-6 rounded-xl border border-gold/40 bg-white p-4 text-sm text-muted">
          No live shipment found. Demo IDs: <strong>SW-10482</strong> and{" "}
          <strong>SW-22901</strong>. Connect this page to your dispatch system
          when you are ready for real tracking.
        </p>
      ) : null}

      {result && result !== "missing" ? (
        <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
            {result.status}
          </p>
          <p className="mt-2 text-lg font-semibold text-navy">
            {result.from} → {result.to}
          </p>
          <ol className="mt-6 space-y-4">
            {result.steps.map((step) => (
              <li key={step.label} className="flex gap-4">
                <span
                  className={`mt-1 h-3 w-3 shrink-0 rounded-full ${step.done ? "bg-teal" : "bg-navy/20"}`}
                />
                <div>
                  <p className="font-semibold text-navy">{step.label}</p>
                  <p className="text-sm text-muted">{step.time}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
