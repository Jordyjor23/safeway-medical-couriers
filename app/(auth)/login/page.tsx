import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { homePathForRoles, roleRequiresTwoFactor } from "@/lib/permissions";
import { getAuthContext } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const ctx = await getAuthContext();
  if (ctx) {
    if (ctx.user.mustChangePassword) redirect("/set-password");
    if (roleRequiresTwoFactor(ctx.roles) && !ctx.user.twoFactorEnabled) {
      redirect("/dashboard/security?mfa=required");
    }
    redirect(homePathForRoles(ctx.roles));
  }

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
