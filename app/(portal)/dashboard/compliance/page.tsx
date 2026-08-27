import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Compliance tracking" };

export default async function ComplianceDashboardPage() {
  await requirePermission("compliance.view");
  const [requirements, records] = await Promise.all([
    prisma.complianceRequirement.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.complianceRecord.findMany({ include: { employee: true, requirement: true } }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Compliance tracking</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        This is document and training tracking status, not a legal determination that a person is compliant.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {requirements.map((requirement) => {
          const related = records.filter((record) => record.requirementId === requirement.id);
          const expired = related.filter((record) => record.status === "EXPIRED" || record.status === "MISSING").length;
          return (
            <article key={requirement.id} className="rounded-2xl border border-line bg-paper p-5">
              <h2 className="font-semibold text-navy">{requirement.name}</h2>
              <p className="mt-2 text-sm text-muted">{related.length} records · {expired} expired or missing</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
