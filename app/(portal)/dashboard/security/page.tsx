import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/portal/ChangePasswordForm";
import { MfaSetup } from "@/components/portal/MfaSetup";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string; mfa?: string }>;
}) {
  const ctx = await requireAuth();
  const params = await searchParams;
  const mfaRequired = !ctx.user.twoFactorEnabled;

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Security</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Change your password and manage multi-factor authentication for {ctx.user.email}.
      </p>
      {params.setup ? (
        <p className="mt-3 rounded-xl border border-medical/30 bg-white px-4 py-3 text-sm text-navy">
          Owner account created. Enable MFA before using the rest of the portal.
        </p>
      ) : null}
      {params.mfa === "required" || (mfaRequired && params.setup) ? (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Owner accounts must enable authenticator MFA before opening other portal pages.
        </p>
      ) : null}

      <section className="mt-8 max-w-2xl rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-xl font-semibold text-navy">Change password</h2>
        <p className="mt-2 text-sm text-muted">
          Enter your current password, then choose a new one. The temporary starter password should
          be replaced immediately.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="mt-8 max-w-2xl rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-xl font-semibold text-navy">Multi-factor authentication</h2>
        <p className="mt-2 text-sm text-muted">
          MFA is required for owner accounts and cannot be turned off after it is enabled. Other
          staff should enable it as well. Use an authenticator app. SMS is not used.
        </p>
        <MfaSetup enabled={Boolean(ctx.user.twoFactorEnabled)} />
      </section>
    </div>
  );
}
