import type { Metadata } from "next";
import { ActivateForm } from "@/components/auth/ActivateForm";

export const metadata: Metadata = {
  title: "Activate account",
  robots: { index: false, follow: false },
};

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <h1 className="text-2xl font-semibold text-navy">Activate your account</h1>
      <p className="mt-2 text-sm text-muted">
        Choose a password to activate your Safeway Couriers portal account. This link expires in 7
        days and can be used only once.
      </p>
      {token ? (
        <ActivateForm token={token} />
      ) : (
        <p className="mt-6 text-sm text-red-700">This activation link is missing a token.</p>
      )}
    </div>
  );
}
