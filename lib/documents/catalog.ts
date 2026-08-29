import type { DocumentCategory } from "@prisma/client";
import { DOCUMENT_TYPES, type DocumentTypeKey } from "@/lib/documents/types";

export const DOCUMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.heic,.heif,.docx,application/pdf,image/jpeg,image/png,image/heic,image/heif,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const DOCUMENT_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif";

export const DOCUMENT_CAPTURE = {
  file: { accept: DOCUMENT_ACCEPT },
  photo: { accept: DOCUMENT_IMAGE_ACCEPT },
  camera: { accept: DOCUMENT_IMAGE_ACCEPT, capture: "environment" as const },
};

export const DUPLICATE_FILE_WARNING = "This file appears to already exist.";

export const ARCHIVE_CONFIRMATION =
  "Archive this document? It will no longer appear as an active document, but its history and file will be retained.";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CORPORATE: "Business / Corporate",
  INSURANCE: "Insurance",
  CUSTOMER_CONTRACTS: "Customer / Contract",
  EMPLOYEE_DOCUMENTS: "Employee / Driver",
  APPLICANT_DOCUMENTS: "Applicant",
  DRIVER_DOCUMENTS: "Employee / Driver",
  COMPLIANCE: "Compliance",
  TRAINING: "Training",
  VEHICLE: "Vehicle",
  POLICIES: "Policies",
  SOPS: "Other",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeKey, string> = {
  DRIVERS_LICENSE: "Driver's license",
  STATE_ID: "State ID",
  VEHICLE_REGISTRATION: "Vehicle registration",
  AUTO_INSURANCE: "Auto insurance",
  MOTOR_VEHICLE_RECORD: "Motor vehicle record",
  BACKGROUND_CHECK: "Background check",
  DRUG_SCREENING: "Drug screening",
  HIPAA_TRAINING: "HIPAA training",
  BLOODBORNE_PATHOGENS: "Bloodborne pathogens",
  HAZMAT_HMR_TRAINING: "HazMat / HMR training",
  UN3373_TRAINING: "UN3373 training",
  OSHA_TRAINING: "OSHA training",
  EMPLOYMENT_ELIGIBILITY: "Employment eligibility",
  W9: "W-9",
  W4: "W-4",
  DIRECT_DEPOSIT: "Direct deposit",
  EMERGENCY_CONTACT: "Emergency contact",
  HANDBOOK_ACKNOWLEDGMENT: "Handbook acknowledgment",
  SIGNED_POLICY: "Signed policy",
  OTHER_CERTIFICATION: "Other certification",
  BUSINESS_REGISTRATION: "Business registration",
  DBA: "DBA / trade name",
  EIN: "EIN documentation",
  GENERAL_LIABILITY: "General liability",
  COMMERCIAL_AUTO_INSURANCE: "Commercial auto insurance",
  WORKERS_COMP: "Workers' compensation",
  PROFESSIONAL_LIABILITY: "Professional liability / E&O",
  CYBER_LIABILITY: "Cyber liability",
  BUSINESS_LICENSE: "Business license",
  PERMIT: "Permit",
  VENDOR_REGISTRATION: "Vendor registration",
  GOVERNMENT_REGISTRATION: "Government registration",
  SERVICE_AGREEMENT: "Service agreement",
  BAA: "Business Associate Agreement",
  CUSTOMER_CONTRACT: "Customer contract",
  PRICING_AGREEMENT: "Pricing agreement",
  STATEMENT_OF_WORK: "Statement of Work",
  PICKUP_INSTRUCTIONS: "Pickup instructions",
  FACILITY_REQUIREMENTS: "Facility requirements",
  CONTRACT: "Contract",
  AMENDMENT: "Amendment",
  RENEWAL: "Renewal",
  RATE_SHEET: "Rate sheet",
  RFP_RFQ: "RFP / RFQ",
  AWARD_NOTICE: "Award notice",
  PURCHASE_ORDER: "Purchase order",
  INSURANCE_REQUIREMENT: "Insurance requirement",
  SLA: "SLA",
  ROUTE_SPECIFICATION: "Route specification",
  VEHICLE_INSPECTION: "Inspection",
  MAINTENANCE_RECORD: "Maintenance record",
  LEASE: "Lease",
  TITLE: "Title",
  TEMPERATURE_CERTIFICATION: "Temperature-control certification",
  CHAIN_OF_CUSTODY: "Chain of custody",
  PROOF_OF_PICKUP: "Proof of pickup",
  PROOF_OF_DELIVERY: "Proof of delivery",
  SHIPPING_PAPERWORK: "Shipping paperwork",
  TEMPERATURE_LOG: "Temperature log",
  SPECIMEN_DOCUMENTATION: "Specimen documentation",
  INCIDENT_DOCUMENTATION: "Incident documentation",
  CUSTOMER_PROVIDED_PAPERWORK: "Customer-provided paperwork",
  BUSINESS_INSURANCE_COI: "Certificate of insurance",
  OTHER: "Other",
};

export const TYPES_BY_CATEGORY: Record<DocumentCategory, DocumentTypeKey[]> = {
  EMPLOYEE_DOCUMENTS: [
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
    "OTHER_CERTIFICATION",
    "OTHER",
  ],
  DRIVER_DOCUMENTS: [
    "DRIVERS_LICENSE",
    "STATE_ID",
    "MOTOR_VEHICLE_RECORD",
    "AUTO_INSURANCE",
    "VEHICLE_REGISTRATION",
    "OTHER",
  ],
  TRAINING: [
    "HIPAA_TRAINING",
    "BLOODBORNE_PATHOGENS",
    "HAZMAT_HMR_TRAINING",
    "UN3373_TRAINING",
    "OSHA_TRAINING",
    "OTHER_CERTIFICATION",
    "OTHER",
  ],
  VEHICLE: [
    "VEHICLE_REGISTRATION",
    "AUTO_INSURANCE",
    "VEHICLE_INSPECTION",
    "MAINTENANCE_RECORD",
    "LEASE",
    "TITLE",
    "TEMPERATURE_CERTIFICATION",
    "OTHER",
  ],
  CUSTOMER_CONTRACTS: [
    "SERVICE_AGREEMENT",
    "BAA",
    "CUSTOMER_CONTRACT",
    "PRICING_AGREEMENT",
    "STATEMENT_OF_WORK",
    "SLA",
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
    "OTHER",
  ],
  INSURANCE: [
    "GENERAL_LIABILITY",
    "COMMERCIAL_AUTO_INSURANCE",
    "WORKERS_COMP",
    "PROFESSIONAL_LIABILITY",
    "CYBER_LIABILITY",
    "AUTO_INSURANCE",
    "INSURANCE_REQUIREMENT",
    "BUSINESS_INSURANCE_COI",
    "OTHER",
  ],
  COMPLIANCE: [
    "CHAIN_OF_CUSTODY",
    "PROOF_OF_PICKUP",
    "PROOF_OF_DELIVERY",
    "TEMPERATURE_LOG",
    "SPECIMEN_DOCUMENTATION",
    "INCIDENT_DOCUMENTATION",
    "SHIPPING_PAPERWORK",
    "CUSTOMER_PROVIDED_PAPERWORK",
    "OTHER",
  ],
  CORPORATE: [
    "BUSINESS_REGISTRATION",
    "DBA",
    "EIN",
    "BUSINESS_LICENSE",
    "PERMIT",
    "VENDOR_REGISTRATION",
    "GOVERNMENT_REGISTRATION",
    "OTHER",
  ],
  APPLICANT_DOCUMENTS: ["BACKGROUND_CHECK", "OTHER"],
  POLICIES: ["SIGNED_POLICY", "HANDBOOK_ACKNOWLEDGMENT", "OTHER"],
  SOPS: ["OTHER"],
};

export function isDocumentType(value: string): value is DocumentTypeKey {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function labelDocumentType(type: string | null | undefined) {
  if (!type) return "—";
  if (isDocumentType(type)) return DOCUMENT_TYPE_LABELS[type];
  return type.replaceAll("_", " ");
}

export function labelDocumentCategory(category: string) {
  return DOCUMENT_CATEGORY_LABELS[category as DocumentCategory] ?? category.replaceAll("_", " ");
}

export const DOCUMENT_CATEGORIES = Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[];
