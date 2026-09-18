import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SetupForm } from "@/components/auth/SetupForm";
import { prisma } from "@/lib/db";
import { ownerSetupIsAvailable } from "@/lib/owner-bootstrap";
import { readServerEnv } from "@/lib/secrets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner setup",
  robots: { index: false, follow: false },
};

export default async function SetupPage() {
  const ownerCount = await prisma.userRole.count({
    where: { role: { key: "OWNER" } },
  });

  if (
    !ownerSetupIsAvailable({
      ownerCount,
      setupSecretConfigured: Boolean(readServerEnv("OWNER_SETUP_SECRET")),
    })
  ) {
    notFound();
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">
        First-time setup
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Create the owner account</h1>
      <p className="mt-2 text-sm text-muted">
        Use this page only on an empty install. After the first Owner exists, bootstrap is disabled.
        Enable multi-factor authentication immediately after creating the account. Password recovery
        uses email reset, not this page.
      </p>
      <SetupForm />
    </div>
  );
}
