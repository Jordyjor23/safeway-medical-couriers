"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { safeInternalPath } from "@/lib/paths";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

function LoginFormFields() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get("next"), "/portal");
  const activated = searchParams.get("activated") === "1";
  const recovered = searchParams.get("recovered") === "1";
  const reset = searchParams.get("reset") === "1";
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
        const identifier = String(form.get("identifier") ?? "").trim();
        const password = String(form.get("password") ?? "");
        const isEmail = identifier.includes("@");
        const result = isEmail
          ? await authClient.signIn.email({ email: identifier.toLowerCase(), password })
          : await authClient.signIn.username({ username: identifier.toLowerCase(), password });
        setPending(false);

        if (result.error) {
          setError("Sign-in failed. Check your email or username and password, then try again.");
          return;
        }

        if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
          router.push("/two-factor");
          return;
        }

        router.push(next);
        router.refresh();
      }}
    >
      {activated ? (
        <p className="rounded-lg border border-medical/30 bg-ice px-3 py-2 text-sm text-navy">
          Account activated. Sign in with your new password.
        </p>
      ) : null}
      {recovered ? (
        <p className="rounded-lg border border-medical/30 bg-ice px-3 py-2 text-sm text-navy">
          Owner password saved. Sign in with the password you just set.
        </p>
      ) : null}
      {reset ? (
        <p className="rounded-lg border border-medical/30 bg-ice px-3 py-2 text-sm text-navy">
          Password updated. Sign in with your new password.
        </p>
      ) : null}
      <label className="block text-sm font-semibold text-navy">
        Email or username
        <input
          name="identifier"
          type="text"
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
        {" · "}
        <Link href="/setup" className="font-semibold text-medical hover:underline">
          Owner setup
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
