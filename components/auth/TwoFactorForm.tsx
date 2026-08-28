"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

export function TwoFactorForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const code = String(form.get("code") ?? "").replace(/\s/g, "");
        const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code });
        if (verifyError) {
          const backup = await authClient.twoFactor.verifyBackupCode({ code });
          if (backup.error) {
            setPending(false);
            setError("That code was not accepted. Try again.");
            return;
          }
        }
        setPending(false);
        router.push("/portal");
        router.refresh();
      }}
    >
      <label className="block text-sm font-semibold text-navy">
        Authenticator or backup code
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          className={fieldClass}
        />
      </label>
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
        {pending ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
