import type { Metadata } from "next";
import { MfaSetup } from "@/components/portal/MfaSetup";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const ctx = await requireAuth();
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Security</h1>
      {params.setup ? (
        <p className="mt-3 rounded-xl border border-medical/30 bg-white px-4 py-3 text-sm text-navy">
          Owner account created. Enable multi-factor authentication before using the portal in
          production.
        </p>
      ) : null}
      <section className="mt-8 max-w-2xl rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-xl font-semibold text-navy">Multi-factor authentication</h2>
        <p className="mt-2 text-sm text-muted">
          MFA is required for owner accounts and strongly encouraged for all staff. Use an
          authenticator app. SMS is not used.
        </p>
        <MfaSetup enabled={Boolean(ctx.user.twoFactorEnabled)} />
      </section>
    </div>
  );
}
