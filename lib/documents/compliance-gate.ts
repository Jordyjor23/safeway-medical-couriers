import type { DocumentVerificationStatus } from "@prisma/client";

export function documentMayCountTowardRequirement(document: {
  documentType: string | null;
  verificationStatus: DocumentVerificationStatus;
  suggestedTypeStatus?: string | null;
  employeeLinks: unknown[];
  customerLinks: unknown[];
  contractLinks: unknown[];
  deliveryLinks: unknown[];
  expirationDate?: Date | null;
}) {
  const associated =
    document.employeeLinks.length > 0 ||
    document.customerLinks.length > 0 ||
    document.contractLinks.length > 0 ||
    document.deliveryLinks.length > 0;
  const typeConfirmed = Boolean(document.documentType) && document.suggestedTypeStatus !== "PENDING";
  return (
    associated &&
    typeConfirmed &&
    document.verificationStatus === "VERIFIED"
  );
}
