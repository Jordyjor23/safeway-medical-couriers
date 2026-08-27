import { prisma } from "@/lib/db";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.value as T;
}

export async function getCurrentLegalDocument(slug: string) {
  return prisma.legalDocument.findFirst({
    where: { slug, isCurrent: true },
    orderBy: { createdAt: "desc" },
  });
}
