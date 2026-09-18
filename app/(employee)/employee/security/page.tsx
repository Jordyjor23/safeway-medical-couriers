import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/portal/ChangePasswordForm";
import { MfaSetup } from "@/components/portal/MfaSetup";
import { requirePortal } from "@/lib/rbac";

export const metadata: Metadata = { title: "Security" };

export default async function EmployeeSecurityPage() {
  const ctx = await requirePortal("employee");
  return <div><h1 className="text-3xl font-semibold text-navy">Security</h1><p className="mt-2 max-w-2xl text-sm text-muted">Change your password and manage multi-factor authentication for {ctx.user.email}.</p><section className="mt-8 max-w-2xl rounded-2xl border border-line bg-paper p-6"><h2 className="text-xl font-semibold text-navy">Change password</h2><ChangePasswordForm /></section><section className="mt-8 max-w-2xl rounded-2xl border border-line bg-paper p-6"><h2 className="text-xl font-semibold text-navy">Multi-factor authentication</h2><p className="mt-2 text-sm text-muted">Use an authenticator app to add another layer of protection.</p><MfaSetup enabled={Boolean(ctx.user.twoFactorEnabled)} /></section></div>;
}
