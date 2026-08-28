import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/portal/ChangePasswordForm";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Set password",
  robots: { index: false, follow: false },
};

export default async function SetPasswordPage() {
  const ctx = await requireAuth();
  if (!ctx.user.mustChangePassword) redirect("/portal");

  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <h1 className="text-2xl font-semibold text-navy">Create your password</h1>
      <p className="mt-2 text-sm text-muted">
        Replace the temporary password before using the Safeway Couriers portal.
      </p>
      <ChangePasswordForm />
    </div>
  );
}
