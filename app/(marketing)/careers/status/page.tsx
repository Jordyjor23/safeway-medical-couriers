import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Application status" };

export default function StatusPage() {
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title="Application status"
        description="Application status, drafts, and documents require an applicant account. Tracking-number lookup is no longer available."
      />
      <Container className="max-w-2xl py-16">
        <div className="rounded-2xl border border-white/10 bg-panel p-8">
          <p className="text-sm leading-relaxed text-mist-soft">
            Sign in with the email you used to apply, or create an account to link a previous
            one-time application. Internal hiring notes are never shown on this page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?next=/applicant/dashboard" className="mkt-btn mkt-btn-primary">
              Sign in to view status
            </Link>
            <Link href="/register" className="mkt-btn">
              Create an applicant account
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
