import type { ExtractedFieldDraft } from "@/lib/documents/extraction/types";
import { isBlockedFieldKey, looksLikeBlockedValue } from "@/lib/documents/extraction/privacy";
import { normalizeProposedDate, normalizeState, normalizeVin } from "@/lib/documents/extraction/normalize";

export const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  licenseNumber: "License number",
  issuingState: "Issuing state",
  issueDate: "Issue date",
  expirationDate: "Expiration date",
  licenseClass: "License class",
  endorsements: "Endorsements",
  restrictions: "Restrictions",
  namedInsured: "Named insured",
  carrier: "Carrier",
  policyNumber: "Policy number",
  policyType: "Policy type",
  effectiveDate: "Effective date",
  coverageLimits: "Coverage limits",
  vehicleInfo: "Vehicle information",
  certificateHolder: "Certificate holder",
  employeeName: "Employee name",
  courseName: "Course name",
  trainingProvider: "Training provider",
  completionDate: "Completion date",
  certificateNumber: "Certificate number",
  trainingCategory: "Training category",
  customerName: "Customer name",
  contractName: "Contract name",
  contractNumber: "Contract number",
  renewalTerms: "Renewal terms",
  paymentTerms: "Payment terms",
  slaReferences: "SLA references",
  insuranceRequirements: "Insurance requirements",
  terminationTerms: "Termination terms",
  pricingReferences: "Pricing / rate references",
  insuredEntity: "Insured entity",
  coverageLimit: "Coverage limit",
  registeredOwner: "Registered owner",
  vin: "VIN",
  plateNumber: "Plate number",
  state: "State",
  make: "Make",
  model: "Model",
  year: "Year",
};

const DATE_KEYS = new Set(["issueDate", "expirationDate", "effectiveDate", "completionDate"]);
const DOCUMENT_FIELD_MAP: Record<string, "expirationDate" | "effectiveDate" | "name"> = {
  expirationDate: "expirationDate",
  effectiveDate: "effectiveDate",
  issueDate: "effectiveDate",
  completionDate: "effectiveDate",
  fullName: "name",
  employeeName: "name",
  contractName: "name",
};

export function prepareExtractedField(input: {
  key: string;
  label?: string;
  rawValue: string;
  confidence: number;
  sourcePage?: number | null;
  sourceSnippet?: string | null;
}): ExtractedFieldDraft | null {
  if (isBlockedFieldKey(input.key) || looksLikeBlockedValue(input.rawValue)) return null;
  const raw = input.rawValue.trim();
  if (!raw) return null;
  let proposed = raw;
  let ambiguousDate = false;
  if (input.key === "vin") proposed = normalizeVin(raw);
  if (input.key === "issuingState" || input.key === "state") proposed = normalizeState(raw);
  if (DATE_KEYS.has(input.key)) {
    const parsed = normalizeProposedDate(raw);
    if (parsed.ok && !parsed.ambiguous) proposed = parsed.iso;
    else {
      ambiguousDate = true;
      proposed = raw;
    }
  }
  return {
    key: input.key,
    label: input.label || FIELD_LABELS[input.key] || input.key,
    rawValue: raw,
    proposedValue: proposed,
    confidence: Math.min(1, Math.max(0, input.confidence)),
    sourcePage: input.sourcePage ?? null,
    sourceSnippet: input.sourceSnippet ? input.sourceSnippet.slice(0, 280) : null,
    ambiguousDate,
    mapsToDocumentField: DOCUMENT_FIELD_MAP[input.key] ?? null,
  };
}
