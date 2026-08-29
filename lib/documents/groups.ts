import type { DocumentTypeKey } from "@/lib/documents/types";

export type DocumentGroup = {
  key: string;
  label: string;
  types?: readonly DocumentTypeKey[];
};

export const CUSTOMER_DOCUMENT_GROUPS: DocumentGroup[] = [
  { key: "agreements", label: "Service Agreements", types: ["SERVICE_AGREEMENT", "CUSTOMER_CONTRACT"] },
  { key: "baa", label: "BAAs", types: ["BAA"] },
  { key: "sla", label: "SLA documents", types: ["SLA"] },
  { key: "pricing", label: "Pricing / rate documents", types: ["PRICING_AGREEMENT", "RATE_SHEET"] },
  { key: "facility", label: "Facility instructions", types: ["FACILITY_REQUIREMENTS", "PICKUP_INSTRUCTIONS", "ROUTE_SPECIFICATION"] },
  { key: "other", label: "Other files" },
];

export const CONTRACT_DOCUMENT_GROUPS: DocumentGroup[] = [
  { key: "main", label: "Main contract", types: ["CONTRACT", "CUSTOMER_CONTRACT", "SERVICE_AGREEMENT"] },
  { key: "amendments", label: "Amendments", types: ["AMENDMENT"] },
  { key: "renewals", label: "Renewals", types: ["RENEWAL"] },
  { key: "rates", label: "Rate sheets", types: ["RATE_SHEET", "PRICING_AGREEMENT"] },
  { key: "sow", label: "SOW", types: ["STATEMENT_OF_WORK"] },
  { key: "award", label: "Award notice", types: ["AWARD_NOTICE"] },
  { key: "po", label: "Purchase orders", types: ["PURCHASE_ORDER"] },
  { key: "insurance", label: "Insurance requirements", types: ["INSURANCE_REQUIREMENT"] },
  { key: "other", label: "Other attachments" },
];

export const DELIVERY_DOCUMENT_GROUPS: DocumentGroup[] = [
  { key: "coc", label: "Chain of custody", types: ["CHAIN_OF_CUSTODY"] },
  { key: "pickup", label: "Proof of pickup", types: ["PROOF_OF_PICKUP"] },
  { key: "pod", label: "Proof of delivery", types: ["PROOF_OF_DELIVERY"] },
  { key: "temperature", label: "Temperature records", types: ["TEMPERATURE_LOG", "TEMPERATURE_CERTIFICATION"] },
  { key: "paperwork", label: "Shipment paperwork", types: ["SHIPPING_PAPERWORK", "SPECIMEN_DOCUMENTATION", "CUSTOMER_PROVIDED_PAPERWORK"] },
  { key: "incident", label: "Incident attachments", types: ["INCIDENT_DOCUMENTATION"] },
  { key: "other", label: "Other files" },
];

export function groupDocumentsByType<T extends { documentType: string | null }>(
  documents: T[],
  groups: DocumentGroup[],
) {
  const used = new Set<T>();
  return groups.map((group) => {
    const items = group.types
      ? documents.filter((document) => document.documentType && group.types?.includes(document.documentType as DocumentTypeKey))
      : documents.filter((document) => !used.has(document) && !groups.some((other) => other.types?.includes(document.documentType as DocumentTypeKey)));
    for (const item of items) used.add(item);
    return { ...group, documents: items };
  });
}
