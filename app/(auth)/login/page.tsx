import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">
        Staff portal
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        Authorized Safeway Couriers personnel only. This is not a public account page.
      </p>
      <LoginForm />
    </div>
  );
}
