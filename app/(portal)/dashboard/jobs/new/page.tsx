import type { Metadata } from "next";
import { JobForm } from "@/components/portal/JobForm";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "New job" };

export default async function NewJobPage() {
  await requirePermission("jobs.create");
  const [categories, requirements] = await Promise.all([
    prisma.careerCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.complianceRequirement.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">New job posting</h1>
      <p className="mt-2 text-sm text-muted">Created as DRAFT. It will not appear on the public careers page until published.</p>
      <JobForm categories={categories} requirements={requirements} />
    </div>
  );
}
