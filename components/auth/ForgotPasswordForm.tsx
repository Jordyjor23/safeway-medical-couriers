"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [pending, setPending] = useState(false);

  if (status === "sent") {
    return (
      <p className="mt-6 text-sm leading-relaxed text-muted">
        If that email is associated with a portal account, password-reset instructions will be
        sent. Check your inbox and spam folder.
      </p>
    );
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const form = new FormData(event.currentTarget);
        const { error: _error } = await authClient.requestPasswordReset({
          email: String(form.get("email") ?? ""),
          redirectTo: "/reset-password",
        });
        setPending(false);
        setStatus("sent");
      }}
    >
      <label className="block text-sm font-semibold text-navy">
        Email
        <input name="email" type="email" required autoComplete="email" className={fieldClass} />
      </label>
      {status === "error" ? (
        <p className="text-sm text-red-700" role="alert">
          The reset request could not be sent. Try again later.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-medical disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
