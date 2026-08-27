"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

function LoginFormFields() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
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
        const { error: signInError, data } = await authClient.signIn.email({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        });
        setPending(false);

        if (signInError) {
          setError("Sign-in failed. Check your email and password, then try again.");
          return;
        }

        if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
          router.push("/two-factor");
          return;
        }

        router.push(next.startsWith("/") ? next : "/dashboard");
        router.refresh();
      }}
    >
      <label className="block text-sm font-semibold text-navy">
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className={fieldClass}
        />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
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
        className="w-full rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-medical disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-muted">
        <Link href="/forgot-password" className="font-semibold text-medical hover:underline">
          Forgot password?
        </Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<div className="mt-6 h-48 animate-pulse rounded-xl bg-ice" />}>
      <LoginFormFields />
    </Suspense>
  );
}
