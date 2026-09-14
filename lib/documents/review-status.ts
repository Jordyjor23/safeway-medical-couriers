import { derivedDocumentState } from "@/lib/documents/lifecycle";

export const DOCUMENT_REVIEW_STATES = [
  "REQUIRED",
  "UPLOADED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "EXPIRING_SOON",
] as const;

export type DocumentReviewState = (typeof DOCUMENT_REVIEW_STATES)[number];

export function documentReviewState(
  document: {
    lifecycleStatus: string;
    verificationStatus: string;
    expirationDate?: Date | null;
    archivedAt?: Date | null;
  } | null,
  now = new Date(),
): DocumentReviewState {
  if (!document) return "REQUIRED";
  const derived = derivedDocumentState(
    {
      lifecycleStatus: document.lifecycleStatus as never,
      verificationStatus: document.verificationStatus as never,
      expirationDate: document.expirationDate,
      archivedAt: document.archivedAt,
    },
    now,
  );
  if (derived === "EXPIRED") return "EXPIRED";
  if (derived === "EXPIRING_SOON") return "EXPIRING_SOON";
  if (document.lifecycleStatus === "REJECTED" || document.verificationStatus === "REJECTED") {
    return "REJECTED";
  }
  if (document.lifecycleStatus === "VERIFIED" || document.verificationStatus === "VERIFIED") {
    return "APPROVED";
  }
  if (document.lifecycleStatus === "NEEDS_REVIEW" || document.lifecycleStatus === "PROCESSING") {
    return "PENDING_REVIEW";
  }
  return "UPLOADED";
}

export function applicantSafeReviewLabel(state: DocumentReviewState) {
  switch (state) {
    case "REQUIRED":
      return "Required";
    case "UPLOADED":
      return "Uploaded";
    case "PENDING_REVIEW":
      return "Pending review";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Needs replacement";
    case "EXPIRED":
      return "Expired";
    case "EXPIRING_SOON":
      return "Expiring soon";
    default:
      return "Uploaded";
  }
}
