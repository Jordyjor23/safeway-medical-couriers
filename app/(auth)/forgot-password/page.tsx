import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <h1 className="text-2xl font-semibold text-navy">Forgot password</h1>
      <p className="mt-2 text-sm text-muted">
        Enter the email for your Safeway Couriers portal account.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-medical hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
