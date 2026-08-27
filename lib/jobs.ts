import { prisma } from "@/lib/db";

export async function getPublishedJobs() {
  return prisma.jobOpening.findMany({
    where: { status: "PUBLISHED" },
    include: { category: true },
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPublishedJobByPublicId(publicId: string) {
  return prisma.jobOpening.findFirst({
    where: { publicId, status: "PUBLISHED" },
    include: { category: true, questions: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getCareerCategories() {
  return prisma.careerCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function compensationLabel(job: {
  compensationMin: { toString(): string } | null;
  compensationMax: { toString(): string } | null;
  payType: string;
  compensationNotes: string | null;
}) {
  if (job.compensationNotes) return job.compensationNotes;
  if (job.payType === "COMMISSION") return "Base salary plus commission, depending on the role.";
  if (job.payType === "ROUTE_BASED") {
    return "Compensation varies by route, mileage, assignment type, urgency, specialty handling requirements and other applicable factors.";
  }
  if (job.compensationMin && job.compensationMax) {
    const suffix = job.payType === "HOURLY" ? "/hour" : "";
    return `$${job.compensationMin.toString()}–$${job.compensationMax.toString()}${suffix} depending on experience, qualifications and assignment`;
  }
  return "Compensation depends on the position, qualifications and assignment.";
}
