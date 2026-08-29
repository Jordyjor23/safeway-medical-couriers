import type { DocumentLifecycleStatus, DocumentVerificationStatus } from "@prisma/client";

export const DEFAULT_EXPIRATION_WARNING_DAYS = [90, 60, 30, 14, 7] as const;

export type DerivedDocumentState =
  | "UPLOADED"
  | "PROCESSING"
  | "NEEDS_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "SUPERSEDED"
  | "ARCHIVED"
  | "EXPIRED"
  | "EXPIRING_SOON";

export function derivedDocumentState(
  document: {
    lifecycleStatus: DocumentLifecycleStatus;
    verificationStatus: DocumentVerificationStatus;
    expirationDate?: Date | null;
    archivedAt?: Date | null;
  },
  now = new Date(),
  warningDays: readonly number[] = DEFAULT_EXPIRATION_WARNING_DAYS,
): DerivedDocumentState {
  if (document.archivedAt || document.lifecycleStatus === "ARCHIVED") return "ARCHIVED";
  if (document.lifecycleStatus === "SUPERSEDED") return "SUPERSEDED";
  if (document.lifecycleStatus === "REJECTED" || document.verificationStatus === "REJECTED") return "REJECTED";
  if (document.lifecycleStatus === "PROCESSING") return "PROCESSING";
  if (document.lifecycleStatus === "NEEDS_REVIEW") return "NEEDS_REVIEW";

  if (document.expirationDate) {
    if (document.expirationDate.getTime() < now.getTime()) return "EXPIRED";
    const soonest = Math.min(...warningDays);
    const remainingMs = document.expirationDate.getTime() - now.getTime();
    if (remainingMs <= soonest * 24 * 60 * 60 * 1000) return "EXPIRING_SOON";
  }

  if (document.lifecycleStatus === "VERIFIED" || document.verificationStatus === "VERIFIED") return "VERIFIED";
  return "UPLOADED";
}

export function isActiveDocument(document: {
  lifecycleStatus: DocumentLifecycleStatus;
  archivedAt?: Date | null;
}) {
  return document.lifecycleStatus !== "SUPERSEDED" && document.lifecycleStatus !== "ARCHIVED" && !document.archivedAt;
}
