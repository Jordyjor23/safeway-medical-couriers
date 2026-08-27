import type { Metadata } from "next";
import { TwoFactorForm } from "@/components/auth/TwoFactorForm";

export const metadata: Metadata = {
  title: "Two-factor authentication",
  robots: { index: false, follow: false },
};

export default function TwoFactorPage() {
  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <h1 className="text-2xl font-semibold text-navy">Two-factor authentication</h1>
      <p className="mt-2 text-sm text-muted">
        Enter the 6-digit code from your authenticator app, or a one-time backup code.
      </p>
      <TwoFactorForm />
    </div>
  );
}
