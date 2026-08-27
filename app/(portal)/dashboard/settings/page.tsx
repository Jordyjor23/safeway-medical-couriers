import type { Metadata } from "next";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const legal = await prisma.legalDocument.findMany({
    where: { isCurrent: true },
    orderBy: { slug: "asc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Legal notices are versioned. Counsel should review this copy before production hiring use.
        Software does not guarantee legal compliance.
      </p>
      <ul className="mt-6 space-y-3">
        {legal.map((doc) => (
          <li key={doc.id} className="rounded-xl border border-line bg-paper p-4">
            <p className="font-semibold text-navy">{doc.title}</p>
            <p className="text-xs text-muted">
              {doc.slug} · version {doc.version}
            </p>
            <p className="mt-2 line-clamp-4 text-sm text-muted">{doc.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
