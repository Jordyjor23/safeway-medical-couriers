import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <h1 className="text-2xl font-semibold text-navy">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted">
        Use at least 12 characters with upper and lowercase letters, a number, and a symbol.
      </p>
      <ResetPasswordForm />
    </div>
  );
}
