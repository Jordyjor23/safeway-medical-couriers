import Link from "next/link";

/** Legacy public lookup was removed. This component only points applicants at login. */
export function StatusLookupForm() {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-6">
      <p className="text-sm text-mist-soft">
        Unauthenticated status lookup is no longer available. Sign in to view your applications.
      </p>
      <Link href="/login?next=/applicant/dashboard" className="mkt-btn mkt-btn-primary mt-4 inline-flex">
        Sign in
      </Link>
    </div>
  );
}
