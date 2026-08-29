export const DEFAULT_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const DEFAULT_SIGNED_URL_SECONDS = 60;

export const ALLOWED_DOCUMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic", "heif", "docx"] as const;

export const REJECTED_DOCUMENT_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "com",
  "dll",
  "js",
  "mjs",
  "cjs",
  "ps1",
  "sh",
  "html",
  "htm",
  "svg",
  "xml",
  "php",
  "jar",
  "msi",
  "scr",
  "vbs",
] as const;

export type AllowedDocumentExtension = (typeof ALLOWED_DOCUMENT_EXTENSIONS)[number];

export const DOCUMENT_TYPES = [
  "DRIVERS_LICENSE",
  "STATE_ID",
  "VEHICLE_REGISTRATION",
  "AUTO_INSURANCE",
  "MOTOR_VEHICLE_RECORD",
  "BACKGROUND_CHECK",
  "DRUG_SCREENING",
  "HIPAA_TRAINING",
  "BLOODBORNE_PATHOGENS",
  "HAZMAT_HMR_TRAINING",
  "UN3373_TRAINING",
  "OSHA_TRAINING",
  "EMPLOYMENT_ELIGIBILITY",
  "W9",
  "W4",
  "DIRECT_DEPOSIT",
  "EMERGENCY_CONTACT",
  "HANDBOOK_ACKNOWLEDGMENT",
  "SIGNED_POLICY",
  "OTHER_CERTIFICATION",
  "BUSINESS_REGISTRATION",
  "DBA",
  "EIN",
  "GENERAL_LIABILITY",
  "COMMERCIAL_AUTO_INSURANCE",
  "WORKERS_COMP",
  "PROFESSIONAL_LIABILITY",
  "CYBER_LIABILITY",
  "BUSINESS_LICENSE",
  "PERMIT",
  "VENDOR_REGISTRATION",
  "GOVERNMENT_REGISTRATION",
  "SERVICE_AGREEMENT",
  "BAA",
  "CUSTOMER_CONTRACT",
  "PRICING_AGREEMENT",
  "STATEMENT_OF_WORK",
  "PICKUP_INSTRUCTIONS",
  "FACILITY_REQUIREMENTS",
  "CONTRACT",
  "AMENDMENT",
  "RENEWAL",
  "RATE_SHEET",
  "RFP_RFQ",
  "AWARD_NOTICE",
  "PURCHASE_ORDER",
  "INSURANCE_REQUIREMENT",
  "SLA",
  "ROUTE_SPECIFICATION",
  "VEHICLE_INSPECTION",
  "MAINTENANCE_RECORD",
  "LEASE",
  "TITLE",
  "TEMPERATURE_CERTIFICATION",
  "CHAIN_OF_CUSTODY",
  "PROOF_OF_PICKUP",
  "PROOF_OF_DELIVERY",
  "SHIPPING_PAPERWORK",
  "TEMPERATURE_LOG",
  "SPECIMEN_DOCUMENTATION",
  "INCIDENT_DOCUMENTATION",
  "CUSTOMER_PROVIDED_PAPERWORK",
  "BUSINESS_INSURANCE_COI",
  "OTHER",
] as const;

export type DocumentTypeKey = (typeof DOCUMENT_TYPES)[number];

export function documentMaxBytes() {
  const configured = Number(process.env.DOCUMENT_MAX_BYTES);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return DEFAULT_DOCUMENT_MAX_BYTES;
}

export function documentSignedUrlSeconds() {
  const configured = Number(process.env.DOCUMENT_SIGNED_URL_SECONDS);
  if (Number.isFinite(configured) && configured > 0) return Math.min(configured, 300);
  return DEFAULT_SIGNED_URL_SECONDS;
}

export function fileExtension(filename: string) {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const parts = base.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}
