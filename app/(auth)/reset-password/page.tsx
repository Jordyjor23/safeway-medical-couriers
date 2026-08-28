import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/forgot-password");

  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <h1 className="text-2xl font-semibold text-navy">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted">
        Use at least 12 characters with upper and lowercase letters, a number, and a symbol.
      </p>
      <ResetPasswordForm token={token} />
    </div>
  );
}
