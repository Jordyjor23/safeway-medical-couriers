export const COMPANY_DOCUMENT_PURPOSES = [
  "REFERENCE",
  "POLICY",
  "SOP",
  "TRAINING",
  "FORM",
  "ACKNOWLEDGMENT",
  "CERTIFICATION_REQUIREMENT",
  "SIGNATURE_REQUIRED",
  "TEMPLATE",
] as const;

export const COMPANY_LIBRARY_CATEGORIES = [
  "HIPAA",
  "OSHA",
  "DOT_HAZMAT",
  "BLOODBORNE_PATHOGENS",
  "OPERATIONS",
  "DRIVER",
  "HR",
  "SAFETY",
  "PHI",
  "EMERGENCY",
  "ORGAN_TISSUE",
  "TEMPERATURE_CONTROL",
  "GENERAL_COMPLIANCE",
  "CORPORATE_GOVERNANCE",
  "FORMS_RECORDS",
  "DOCUMENT_CONTROL",
  "UN3373",
  "MEDICAL_COURIER_OPERATIONS",
] as const;

export const COMPANY_PUBLICATION_STATUSES = ["DRAFT", "ACTIVE", "SUPERSEDED", "ARCHIVED"] as const;

export const COMPANY_ASSIGNMENT_ACTIONS = [
  "READ",
  "READ_AND_ACKNOWLEDGE",
  "UPLOAD_CERTIFICATE",
  "COMPLETE_FORM",
  "SIGN",
  "TRAINING_REQUIRED",
  "COMPETENCY_REQUIRED",
  "ROLE_AUTHORIZATION",
  "REFERENCE_ONLY",
] as const;

export const COMPANY_ASSIGNMENT_AUDIENCES = [
  "ALL_EMPLOYEES",
  "ALL_DRIVERS",
  "ROLE",
  "EMPLOYEE",
  "APPLICANTS",
  "FUTURE_HIRES",
  "JOB",
] as const;

export const COMPANY_LIBRARY_MANAGER_ROLES = ["OWNER", "ADMIN"] as const;

export const COMPANY_ACKNOWLEDGMENT_TEXT =
  "I acknowledge that I received and reviewed this document.";

export const COMPANY_ACKNOWLEDGMENT_DISCLAIMER =
  "This is an acknowledgment of receipt and review. It is not an electronic signature and is not legally equivalent to DocuSign or another e-signature provider.";

export const CONTROLLED_DOCUMENT_STATUSES = ["PENDING_SOURCE", "DRAFT", "ACTIVE", "SUPERSEDED", "ARCHIVED"] as const;
export const IMPLEMENTATION_TASK_STATUSES = ["OPEN", "IN_PROGRESS", "BLOCKED", "COMPLETED", "WAIVED", "CANCELED"] as const;
export const SERVICE_AUTHORIZATION_STATUSES = [
  "AUTHORIZED",
  "AUTHORIZED_AFTER_ROLE_TRAINING",
  "AUTHORIZED_WITH_WRITTEN_CLIENT_PROTOCOL",
  "AUTHORIZED_AFTER_APPLICABLE_TRAINING",
  "CONDITIONAL",
  "DEFERRED",
  "PROHIBITED",
  "REJECT_HOLD",
] as const;

export const FORM_LIBRARY_PURPOSES = ["FORM", "TEMPLATE"] as const;

export const COMPANY_OWNER_ENTITY = "COMPANY";

export function purposeToStorageCategory(purpose: string) {
  switch (purpose) {
    case "SOP":
      return "SOPS" as const;
    case "POLICY":
    case "ACKNOWLEDGMENT":
      return "POLICIES" as const;
    case "TRAINING":
      return "TRAINING" as const;
    case "FORM":
    case "TEMPLATE":
    case "CERTIFICATION_REQUIREMENT":
      return "COMPLIANCE" as const;
    default:
      return "CORPORATE" as const;
  }
}

export function nextRevision(current: string) {
  const match = current.trim().match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return `${current}-2`;
  const major = Number(match[1]);
  const minor = Number(match[2] ?? "0");
  return `${major}.${minor + 1}`;
}

export function isCompanyLibraryManager(roles: string[]) {
  return roles.some((role) => (COMPANY_LIBRARY_MANAGER_ROLES as readonly string[]).includes(role));
}

export function isFormLibraryPurpose(purpose: string) {
  return (FORM_LIBRARY_PURPOSES as readonly string[]).includes(purpose);
}
