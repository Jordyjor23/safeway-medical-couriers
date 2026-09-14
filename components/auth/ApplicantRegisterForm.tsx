"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { safeInternalPath } from "@/lib/paths";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

function Fields() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get("next"), "/applicant/dashboard");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setPending(true);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/applicant/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legalFirstName: String(form.get("legalFirstName") ?? ""),
            legalLastName: String(form.get("legalLastName") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            phone: String(form.get("phone") ?? ""),
          }),
        });
        const result = await response.json().catch(() => null);
        setPending(false);
        if (!response.ok) {
          setError(result?.error ?? "The account could not be created.");
          return;
        }
        router.push(next);
        router.refresh();
      }}
    >
      <label className="block text-sm font-semibold text-navy">
        Legal first name
        <input name="legalFirstName" required autoComplete="given-name" className={fieldClass} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Legal last name
        <input name="legalLastName" required autoComplete="family-name" className={fieldClass} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Email
        <input name="email" type="email" required autoComplete="email" className={fieldClass} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Phone
        <input name="phone" type="tel" autoComplete="tel" className={fieldClass} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Password
        <input name="password" type="password" required autoComplete="new-password" className={fieldClass} />
      </label>
      <p className="text-xs text-muted">Use at least 12 characters with mixed case, a number, and a symbol.</p>
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
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-medical hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ApplicantRegisterForm() {
  return (
    <Suspense fallback={<div className="mt-6 h-48 animate-pulse rounded-xl bg-ice" />}>
      <Fields />
    </Suspense>
  );
}
