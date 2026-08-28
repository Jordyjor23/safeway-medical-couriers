"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeOwnPassword } from "@/app/(portal)/dashboard/security/actions";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 focus:border-medical focus:ring-2";

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-4 max-w-md space-y-4"
      action={async (formData) => {
        setError(null);
        setSuccess(false);
        setPending(true);
        const result = await changeOwnPassword(formData);
        setPending(false);
        if (result && "error" in result && result.error) {
          setError(result.error);
          return;
        }
        setSuccess(true);
        (document.getElementById("change-password-form") as HTMLFormElement | null)?.reset();
        router.push("/portal");
        router.refresh();
      }}
      id="change-password-form"
    >
      <label className="block text-sm font-semibold text-navy">
        Current password
        <input name="currentPassword" type="password" required autoComplete="current-password" className={fieldClass} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        New password
        <input name="newPassword" type="password" required autoComplete="new-password" className={fieldClass} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Confirm new password
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
      {success ? (
        <p className="text-sm text-medical" role="status">
          Password updated. Use the new password the next time you sign in.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-medical disabled:opacity-60"
      >
        {pending ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
