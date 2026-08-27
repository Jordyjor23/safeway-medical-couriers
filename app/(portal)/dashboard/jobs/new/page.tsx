import type { Metadata } from "next";
import { JobForm } from "@/components/portal/JobForm";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "New job" };

export default async function NewJobPage() {
  await requirePermission("jobs.create");
  const categories = await prisma.careerCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">New job posting</h1>
      <JobForm categories={categories} />
    </div>
  );
}
