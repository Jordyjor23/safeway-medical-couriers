import type { DocumentCategory } from "@prisma/client";

export const DOCUMENT_POLICY_DOMAINS = [
  "HR",
  "APPLICANT",
  "COMPLIANCE",
  "DELIVERY",
  "CUSTOMER",
  "PHI_OPERATIONAL",
  "CORPORATE",
] as const;

export type DocumentPolicyDomain = (typeof DOCUMENT_POLICY_DOMAINS)[number];

const PHI_OPERATIONAL_TYPES = new Set([
  "CHAIN_OF_CUSTODY",
  "PROOF_OF_PICKUP",
  "PROOF_OF_DELIVERY",
  "SHIPPING_PAPERWORK",
  "TEMPERATURE_LOG",
  "SPECIMEN_DOCUMENTATION",
  "INCIDENT_DOCUMENTATION",
  "CUSTOMER_PROVIDED_PAPERWORK",
]);

const HR_TYPES = new Set([
  "DRIVERS_LICENSE",
  "STATE_ID",
  "EMPLOYMENT_ELIGIBILITY",
  "W9",
  "W4",
  "DIRECT_DEPOSIT",
  "EMERGENCY_CONTACT",
  "HANDBOOK_ACKNOWLEDGMENT",
  "SIGNED_POLICY",
  "BACKGROUND_CHECK",
  "DRUG_SCREENING",
  "RESUME",
  "CONFIDENTIALITY_ACK",
  "MVR_AUTHORIZATION",
  "BACKGROUND_AUTHORIZATION",
  "POLICY_ACKNOWLEDGMENT",
]);

const COMPLIANCE_TYPES = new Set([
  "HIPAA_TRAINING",
  "BLOODBORNE_PATHOGENS",
  "HAZMAT_HMR_TRAINING",
  "UN3373_TRAINING",
  "OSHA_TRAINING",
  "MOTOR_VEHICLE_RECORD",
  "AUTO_INSURANCE",
  "VEHICLE_REGISTRATION",
  "OTHER_CERTIFICATION",
  "COMPANY_TRAINING",
]);

const HR_ISOLATED_DOMAINS = new Set<DocumentPolicyDomain>(["HR", "APPLICANT", "COMPLIANCE"]);
const OPERATIONAL_QUERY_EXCLUDED = new Set<DocumentPolicyDomain>(["HR", "APPLICANT", "COMPLIANCE"]);
const EMPLOYEE_HR_EXCLUDED = new Set<DocumentPolicyDomain>(["DELIVERY", "PHI_OPERATIONAL"]);

export function policyDomainFor(
  category?: string | null,
  documentType?: string | null,
): DocumentPolicyDomain {
  if (documentType && PHI_OPERATIONAL_TYPES.has(documentType)) return "PHI_OPERATIONAL";
  if (category === "PHI_OPERATIONAL" || category === "DELIVERY") {
    return category === "PHI_OPERATIONAL" ? "PHI_OPERATIONAL" : "DELIVERY";
  }
  if (category === "APPLICANT" || category === "APPLICANT_DOCUMENTS") return "APPLICANT";
  if (category === "HR" || category === "EMPLOYEE_DOCUMENTS" || category === "DRIVER_DOCUMENTS") {
    if (documentType && COMPLIANCE_TYPES.has(documentType)) return "COMPLIANCE";
    return "HR";
  }
  if (category === "TRAINING" || category === "POLICIES") return "COMPLIANCE";
  if (category === "COMPLIANCE") {
    if (documentType && PHI_OPERATIONAL_TYPES.has(documentType)) return "PHI_OPERATIONAL";
    if (documentType && HR_TYPES.has(documentType)) return "HR";
    if (documentType && COMPLIANCE_TYPES.has(documentType)) return "COMPLIANCE";
    return "PHI_OPERATIONAL";
  }
  if (category === "CUSTOMER" || category === "CUSTOMER_CONTRACTS") return "CUSTOMER";
  if (category === "VEHICLE") {
    return documentType && COMPLIANCE_TYPES.has(documentType) ? "COMPLIANCE" : "CORPORATE";
  }
  if (documentType && HR_TYPES.has(documentType)) return "HR";
  if (documentType && COMPLIANCE_TYPES.has(documentType)) return "COMPLIANCE";
  return "CORPORATE";
}

export function isHrIsolatedDomain(domain: DocumentPolicyDomain) {
  return HR_ISOLATED_DOMAINS.has(domain);
}

export function canAttachDomainToDelivery(domain: DocumentPolicyDomain) {
  return !HR_ISOLATED_DOMAINS.has(domain);
}

export function isExcludedFromOperationalQueries(domain: DocumentPolicyDomain) {
  return OPERATIONAL_QUERY_EXCLUDED.has(domain);
}

export function isExcludedFromEmployeeHrLists(domain: DocumentPolicyDomain) {
  return EMPLOYEE_HR_EXCLUDED.has(domain);
}

export function deliveryCompatibleCategories(): DocumentCategory[] {
  return ["DELIVERY", "PHI_OPERATIONAL", "CUSTOMER", "CUSTOMER_CONTRACTS", "CORPORATE", "SOPS", "INSURANCE"];
}

export function applicantDocumentCategories(): DocumentCategory[] {
  return ["APPLICANT", "APPLICANT_DOCUMENTS", "HR", "COMPLIANCE", "TRAINING", "DRIVER_DOCUMENTS", "EMPLOYEE_DOCUMENTS"];
}

export function employeeHrCategories(): DocumentCategory[] {
  return ["HR", "EMPLOYEE_DOCUMENTS", "DRIVER_DOCUMENTS", "TRAINING", "COMPLIANCE", "POLICIES", "VEHICLE"];
}

export function sanitizeDocumentOwnerInput<T extends Record<string, unknown>>(payload: T) {
  const next = { ...payload };
  delete next.ownerId;
  delete next.ownerEntity;
  delete next.uploadedBy;
  delete next.userId;
  delete next.applicantId;
  delete next.employeeId;
  delete next.organizationId;
  delete next.role;
  return next;
}

export function resolveStoredOwner(args: {
  employeeId?: string | null;
  applicantId?: string | null;
  customerId?: string | null;
  deliveryId?: string | null;
  contractId?: string | null;
}) {
  if (args.applicantId) return { ownerEntity: "APPLICANT", ownerId: args.applicantId };
  if (args.employeeId) return { ownerEntity: "EMPLOYEE", ownerId: args.employeeId };
  if (args.customerId) return { ownerEntity: "CUSTOMER", ownerId: args.customerId };
  if (args.contractId) return { ownerEntity: "CONTRACT", ownerId: args.contractId };
  if (args.deliveryId) return { ownerEntity: "DELIVERY", ownerId: args.deliveryId };
  return { ownerEntity: "COMPANY", ownerId: null as string | null };
}
