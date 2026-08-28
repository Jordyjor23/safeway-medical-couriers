"use client";

import { useState } from "react";
import { activateAccount } from "@/app/(auth)/activate/actions";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 focus:border-medical focus:ring-2";

export function ActivateForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      action={async (formData) => {
        setError(null);
        setPending(true);
        const result = await activateAccount(formData);
        setPending(false);
        if (result?.error) setError(result.error);
      }}
    >
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm font-semibold text-navy">
        New password
        <input name="newPassword" type="password" required autoComplete="new-password" className={fieldClass} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Confirm password
        <input name="confirmPassword" type="password" required autoComplete="new-password" className={fieldClass} />
      </label>
      <p className="text-xs text-muted">
        Use at least 12 characters with upper and lowercase letters, a number, and a symbol.
      </p>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-medical disabled:opacity-60"
      >
        {pending ? "Activating…" : "Activate account"}
      </button>
    </form>
  );
}
