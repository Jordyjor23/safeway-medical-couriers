import { prisma } from "@/lib/db";
import {
  DEFAULT_ACCOMMODATION_NOTICE,
  DEFAULT_APPLICANT_PRIVACY,
  DEFAULT_EEO_STATEMENT,
} from "@/lib/legal-copy";

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

const LEGAL_FALLBACKS: Record<string, { title: string; body: string }> = {
  eeo: { title: "Equal Employment Opportunity", body: DEFAULT_EEO_STATEMENT },
  "applicant-privacy": { title: "Applicant Privacy Notice", body: DEFAULT_APPLICANT_PRIVACY },
  accommodation: { title: "Accessibility / Accommodation", body: DEFAULT_ACCOMMODATION_NOTICE },
};

/** Public legal pages must render even if production has not been seeded. */
export async function getPublishedLegalDocument(slug: string) {
  const doc = await getCurrentLegalDocument(slug);
  if (doc) return { title: doc.title, body: doc.body };
  return LEGAL_FALLBACKS[slug] ?? null;
}
