"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { passwordIssues } from "@/lib/password";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const password = String(form.get("password") ?? "");
        const issues = passwordIssues(password);
        if (issues.length) {
          setError(issues.join(" "));
          return;
        }
        setPending(true);
        const { error: resetError } = await authClient.resetPassword({
          newPassword: password,
        });
        setPending(false);
        if (resetError) {
          setError("This reset link is invalid or has expired.");
          return;
        }
        router.push("/login");
      }}
    >
      <label className="block text-sm font-semibold text-navy">
        New password
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
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
        {pending ? "Updating…" : "Update password"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-medical hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
