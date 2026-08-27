import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/auth/SetupForm";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner setup",
  robots: { index: false, follow: false },
};

export default async function SetupPage() {
  const ownerCount = await prisma.userRole.count({
    where: { role: { key: "OWNER" } },
  });

  if (ownerCount > 0) {
    redirect("/login");
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">
        First-time setup
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Create the owner account</h1>
      <p className="mt-2 text-sm text-muted">
        This page works only until the first owner exists. Use the setup secret from your
        environment configuration. Never store that secret in source control.
      </p>
      <SetupForm />
    </div>
  );
}
