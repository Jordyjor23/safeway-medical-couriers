"use client";

import { useState } from "react";
import { passwordIssues } from "@/lib/password";
import { setupOwner } from "@/app/(auth)/setup/actions";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

export function SetupForm({ recover = false }: { recover?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      action={async (formData) => {
        setError(null);
        const password = String(formData.get("password") ?? "");
        const issues = passwordIssues(password);
        if (issues.length) {
          setError(issues.join(" "));
          return;
        }
        setPending(true);
        const result = await setupOwner(formData);
        setPending(false);
        if (result?.error) setError(result.error);
      }}
    >
      <label className="block text-sm font-semibold text-navy">
        Setup secret
        <input name="setupSecret" type="password" required autoComplete="off" className={fieldClass} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Full name
        <input name="name" required autoComplete="name" className={fieldClass} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Owner email
        <input name="email" type="email" required autoComplete="email" className={fieldClass} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={fieldClass}
        />
      </label>
      <p className="text-xs text-muted">
        Use at least 12 characters with upper and lowercase letters, a number, and a symbol.
        Enable multi-factor authentication immediately after signing in.
      </p>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-medical disabled:opacity-60"
      >
        {pending
          ? recover
            ? "Saving password…"
            : "Creating owner account…"
          : recover
            ? "Set owner password"
            : "Create owner account"}
      </button>
    </form>
  );
}
