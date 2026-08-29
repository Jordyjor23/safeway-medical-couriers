import { derivedDocumentState, DEFAULT_EXPIRATION_WARNING_DAYS } from "@/lib/documents/lifecycle";

export function expirationLabel(
  document: {
    expirationDate?: Date | null;
    lifecycleStatus: Parameters<typeof derivedDocumentState>[0]["lifecycleStatus"];
    verificationStatus: Parameters<typeof derivedDocumentState>[0]["verificationStatus"];
    archivedAt?: Date | null;
  },
  now = new Date(),
  warningDays: readonly number[] = DEFAULT_EXPIRATION_WARNING_DAYS,
) {
  if (!document.expirationDate) return "No Expiration";
  const state = derivedDocumentState(document, now, warningDays);
  if (state === "EXPIRED") return "Expired";
  if (state === "EXPIRING_SOON") return "Expiring Soon";
  if (state === "ARCHIVED" || state === "SUPERSEDED") return state === "ARCHIVED" ? "Archived" : "Superseded";
  return "Valid";
}

export function formatPersonName(first: string, last: string) {
  return `${first} ${last}`.trim();
}

export function associatedWithLabel(document: {
  employeeLinks: { employee: { legalFirstName: string; legalLastName: string } }[];
  customerLinks: { customer: { legalName: string } }[];
  contractLinks: { contract: { contractNumber: string; customer: { legalName: string } } }[];
  deliveryLinks: { delivery: { deliveryNumber: string; customer: { legalName: string } } }[];
}) {
  const parts = [
    ...document.employeeLinks.map((link) => formatPersonName(link.employee.legalFirstName, link.employee.legalLastName)),
    ...document.customerLinks.map((link) => link.customer.legalName),
    ...document.contractLinks.map((link) => `${link.contract.contractNumber} · ${link.contract.customer.legalName}`),
    ...document.deliveryLinks.map((link) => `${link.delivery.deliveryNumber} · ${link.delivery.customer.legalName}`),
  ];
  return parts.length ? parts.join(" · ") : "Company";
}

export function verificationLabel(status: string) {
  if (status === "VERIFIED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return "Unverified";
}

export function documentFileHref(documentId: string) {
  return `/api/portal/documents/${documentId}/file`;
}

export function isoDateInput(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}
