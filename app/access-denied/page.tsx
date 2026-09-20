import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-line bg-paper p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">
          Safeway Couriers portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-navy">Access denied</h1>
        <p className="mt-3 text-sm text-muted">
          Your account is active, but it does not currently have permission to open a portal.
          Ask an Owner or authorized administrator to review your role assignments.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            Return to sign in
          </Link>
          <Link
            href="/"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy"
          >
            Go to website
          </Link>
        </div>
      </section>
    </main>
  );
}
