import type { Metadata } from "next";
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

  return (
    <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">
        {ownerCount > 0 ? "Owner recovery" : "First-time setup"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">
        {ownerCount > 0 ? "Set the owner password" : "Create the owner account"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Localhost and production are different databases. Use this page on{" "}
        <strong>portal.safewaycouriers.com</strong> with the Vercel setup secret. If you already
        inserted an owner email in the production database, enter that email and choose a new
        password here. This does not copy passwords from localhost.
      </p>
      <SetupForm recover={ownerCount > 0} />
    </div>
  );
}
