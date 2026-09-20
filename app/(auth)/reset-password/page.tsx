import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { resolvePasswordResetToken } from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/forgot-password");

  const pending = await resolvePasswordResetToken(token);
  if (!pending) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-navy">Reset link no longer active</h1>
        <p className="mt-3 text-sm text-muted">
          This link was already used, expired, or was replaced when a newer password-reset email was requested.
        </p>
        <p className="mt-2 text-sm text-muted">
          Opening a reset link does not use it. The link is consumed only after a password is successfully changed.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-medical"
        >
          Send a new reset email
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <h1 className="text-2xl font-semibold text-navy">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted">
        Use at least 12 characters with upper and lowercase letters, a number, and a symbol.
      </p>
      <p className="mt-2 text-xs text-muted">
        This link remains valid until you successfully change the password, it expires, or a newer reset email is requested.
      </p>
      <ResetPasswordForm token={token} />
    </div>
  );
}
