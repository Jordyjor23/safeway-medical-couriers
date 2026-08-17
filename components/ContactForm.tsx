"use client";

import { useState } from "react";
import { site } from "@/lib/site";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-ink outline-none ring-teal/30 transition focus:border-teal focus:ring-2";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-teal/30 bg-white p-8">
        <h2 className="display text-3xl text-navy">Message sent.</h2>
        <p className="mt-3 text-muted">
          We will reply during the next dispatch window. For an active pickup,
          call {site.phone}.
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
      <div className="grid gap-4">
        <label className="text-sm font-semibold text-navy">
          Name
          <input name="name" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Email
          <input name="email" type="email" required className={fieldClass} />
        </label>
        <label className="text-sm font-semibold text-navy">
          Message
          <textarea name="message" rows={5} required className={fieldClass} />
        </label>
      </div>
      <button
        type="submit"
        className="mt-6 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-teal"
      >
        Send message
      </button>
    </form>
  );
}
