"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { completePasswordReset } from "@/app/(auth)/reset-password/actions";
import { passwordIssues } from "@/lib/password";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

function ResetPasswordFormFields({ tokenFromPath }: { tokenFromPath?: string }) {
  const searchParams = useSearchParams();
  const token = tokenFromPath || searchParams.get("token") || "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const missingToken = !token;

  return (
    <form
      className="mt-6 space-y-4"
      action={async (formData) => {
        if (!token) {
          setError("This reset link is missing or invalid. Request a new password reset email.");
          return;
        }
        const password = String(formData.get("password") ?? "");
        const issues = passwordIssues(password);
        if (issues.length) {
          setError(issues.join(" "));
          return;
        }
        setError(null);
        setPending(true);
        formData.set("token", token);
        const result = await completePasswordReset(formData);
        setPending(false);
        if (result?.error) setError(result.error);
      }}
    >
      <input type="hidden" name="token" value={token} />
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
      <p className="text-xs text-muted">
        Use at least 12 characters with upper and lowercase letters, a number, and a symbol.
      </p>
      {missingToken ? (
        <p className="text-sm text-red-700" role="alert">
          This reset link is missing or invalid. Request a new password reset email.
        </p>
      ) : error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !token}
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

export function ResetPasswordForm({ tokenFromPath }: { tokenFromPath?: string }) {
  return (
    <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-ice" />}>
      <ResetPasswordFormFields tokenFromPath={tokenFromPath} />
    </Suspense>
  );
}
