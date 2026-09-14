import type { CompanyDocumentPurpose, CompanyLibraryCategory, ControlledDocumentType, ServiceAuthorizationStatus } from "@prisma/client";

export const SC_MCM_PACKAGE_KEY = "SC-MCM-001";
export const SC_MCM_MASTER_ID = "SC-MCM-001";
export const SC_ERP_PACKAGE_KEY = "SC-ERP-001";
export const SC_FRM_PACKAGE_KEY = "SC-FRM-PACKAGE";

export const SC_FRM_IDS = Array.from({ length: 20 }, (_, index) => `SC-FRM-${String(index + 1).padStart(3, "0")}`);

/** Master-incorporated controlled IDs. SC-ERP-001 and SC-FRM-* use standalone files. */
export const SC_MCM_INCORPORATED_IDS = [
  "SC-MCM-001",
  "SC-ECP-001",
  "SC-HIP-001",
  "SC-BAA-001",
  "SC-HMR-001",
  "SC-UN3373-001",
  "SC-OPS-001",
  "SC-SPEC-001",
] as const;

export type OfficialSourcePackageKey = typeof SC_MCM_PACKAGE_KEY | typeof SC_ERP_PACKAGE_KEY | typeof SC_FRM_PACKAGE_KEY;

export type OfficialSourcePackage = {
  key: OfficialSourcePackageKey;
  title: string;
  filename: string;
  expectedSha256: string;
  expectedBytes: number;
  documentNumber: string;
  revision: string;
  purpose: CompanyDocumentPurpose;
  libraryCategory: CompanyLibraryCategory;
  suggestedAssignment: "READ_AND_ACKNOWLEDGE" | null;
  controlledDocumentIds: readonly string[];
  notes: string;
};

/**
 * Official Rev 1.0 source files from Jordan's compliance ZIP.
 * Binaries are never committed. These hashes are the upload-integrity check.
 *
 * SHA-256:
 * - Master DOCX  3f2950685ef3fa9f38731620d081795d34b20a0c88d1d4728bf70689aa9cceb7 (168806 bytes)
 * - Emergency    aef57209062a65ea90caf7f6f495a9a02c567a7078fa03025436d206a2eb11cc (50245 bytes)
 * - Forms PDF    0c7303fa05c8265c9f2b45bce1b3f2857cc08ef37b90a2a7704c3bd6edb4b622 (614649 bytes)
 */
export const OFFICIAL_SOURCE_PACKAGES: OfficialSourcePackage[] = [
  {
    key: SC_MCM_PACKAGE_KEY,
    title: "Master Compliance & Operations Manual",
    filename: "Safeway_Couriers_MASTER_Compliance_Operations_Manual_SC-MCM-001_Rev1.0_FINAL_QA.docx",
    expectedSha256: "3f2950685ef3fa9f38731620d081795d34b20a0c88d1d4728bf70689aa9cceb7",
    expectedBytes: 168806,
    documentNumber: "SC-MCM-001",
    revision: "1.0",
    purpose: "REFERENCE",
    libraryCategory: "GENERAL_COMPLIANCE",
    suggestedAssignment: null,
    controlledDocumentIds: SC_MCM_INCORPORATED_IDS,
    notes: "Upload as REFERENCE (or POLICY) / GENERAL_COMPLIANCE. Keep DRAFT until owner approval and effective-date review. Incorporated sections share this one ManagedDocument. Do not use this file for SC-ERP-001 or SC-FRM-001…020.",
  },
  {
    key: SC_ERP_PACKAGE_KEY,
    title: "Emergency / Incident Program",
    filename: "Safeway_Couriers_Emergency_Incident_Program.docx",
    expectedSha256: "aef57209062a65ea90caf7f6f495a9a02c567a7078fa03025436d206a2eb11cc",
    expectedBytes: 50245,
    documentNumber: "SC-ERP-001",
    revision: "1.0",
    purpose: "SOP",
    libraryCategory: "EMERGENCY",
    suggestedAssignment: "READ_AND_ACKNOWLEDGE",
    controlledDocumentIds: ["SC-ERP-001"],
    notes: "Standalone source for SC-ERP-001 (preferred over the master DOCX). Upload as SOP/POLICY / EMERGENCY. READ_AND_ACKNOWLEDGE only after owner approval. Acknowledgments are not e-signatures.",
  },
  {
    key: SC_FRM_PACKAGE_KEY,
    title: "Forms and Records Package",
    filename: "Safeway_Couriers_Forms_and_Records_Package.pdf",
    expectedSha256: "0c7303fa05c8265c9f2b45bce1b3f2857cc08ef37b90a2a7704c3bd6edb4b622",
    expectedBytes: 614649,
    documentNumber: "SC-FRM-PACKAGE",
    revision: "1.0",
    purpose: "FORM",
    libraryCategory: "FORMS_RECORDS",
    suggestedAssignment: null,
    controlledDocumentIds: SC_FRM_IDS,
    notes: "SC-FRM-001 through SC-FRM-020 share this one PDF ManagedDocument. Upload as FORM/TEMPLATE / FORMS_RECORDS. Keep private; do not activate until owner approval fields are complete.",
  },
];

export function sourcePackageKeyForControlledId(controlledDocumentId: string): OfficialSourcePackageKey {
  if (controlledDocumentId === SC_ERP_PACKAGE_KEY) return SC_ERP_PACKAGE_KEY;
  if (controlledDocumentId.startsWith("SC-FRM-")) return SC_FRM_PACKAGE_KEY;
  return SC_MCM_PACKAGE_KEY;
}

export function officialSourcePackageByKey(key: string | null | undefined) {
  return OFFICIAL_SOURCE_PACKAGES.find((row) => row.key === key) ?? null;
}

function normalizeHash(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeFilename(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function identifyOfficialSourcePackage(args: {
  sha256?: string | null;
  filename?: string | null;
  documentNumber?: string | null;
  sourcePackageKey?: string | null;
}) {
  const explicit = officialSourcePackageByKey(args.sourcePackageKey);
  if (explicit) return explicit;
  const hash = normalizeHash(args.sha256);
  const byHash = OFFICIAL_SOURCE_PACKAGES.find((row) => row.expectedSha256 === hash);
  if (byHash) return byHash;
  const documentNumber = (args.documentNumber ?? "").trim().toUpperCase();
  if (documentNumber) {
    const byNumber = OFFICIAL_SOURCE_PACKAGES.find(
      (row) => row.documentNumber === documentNumber || row.controlledDocumentIds.includes(documentNumber),
    );
    if (byNumber) return byNumber;
  }
  const filename = normalizeFilename(args.filename);
  if (filename) {
    const byName = OFFICIAL_SOURCE_PACKAGES.find((row) => filename.includes(normalizeFilename(row.filename)) || filename.includes(row.key.toLowerCase()));
    if (byName) return byName;
  }
  return null;
}

export function officialSourceHashMatches(sha256: string | null | undefined, expectedSha256: string) {
  return Boolean(sha256) && normalizeHash(sha256) === expectedSha256;
}

export type ControlledRegisterSeed = {
  controlledDocumentId: string;
  title: string;
  description: string;
  category: CompanyLibraryCategory;
  documentType: ControlledDocumentType;
  ownerRole: string;
  approvalAuthority: string;
  sectionReference?: string;
  metadata?: Record<string, string>;
};

export const CONTROLLED_REGISTER_SEEDS: ControlledRegisterSeed[] = [
  {
    controlledDocumentId: "SC-MCM-001",
    title: "Master Compliance & Operations Manual",
    description: "Master source package for Safeway Couriers compliance and operations. Incorporated sections share the master DOCX ManagedDocument after upload — no duplicate Blob objects. SC-ERP-001 and SC-FRM-001…020 use standalone files.",
    category: "GENERAL_COMPLIANCE",
    documentType: "MANUAL",
    ownerRole: "OWNER",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "Master package",
  },
  {
    controlledDocumentId: "SC-ECP-001",
    title: "OSHA Bloodborne Pathogens Exposure Control Plan",
    description: "Exposure control plan section of the master compliance package.",
    category: "BLOODBORNE_PATHOGENS",
    documentType: "PLAN",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-ECP-001",
  },
  {
    controlledDocumentId: "SC-HIP-001",
    title: "HIPAA Privacy & Security Program",
    description: "HIPAA privacy and security program section of the master compliance package.",
    category: "HIPAA",
    documentType: "PROGRAM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-HIP-001",
  },
  {
    controlledDocumentId: "SC-BAA-001",
    title: "Business Associate Agreement Template",
    description: "BAA template section of the master compliance package. Template only — not a completed counterparty agreement.",
    category: "HIPAA",
    documentType: "TEMPLATE",
    ownerRole: "OWNER",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-BAA-001",
  },
  {
    controlledDocumentId: "SC-HMR-001",
    title: "DOT / HMR Hazardous Materials Transportation Program",
    description: "Hazardous materials transportation program. Function-specific and driver training remain role/route dependent.",
    category: "DOT_HAZMAT",
    documentType: "PROGRAM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-HMR-001",
  },
  {
    controlledDocumentId: "SC-UN3373-001",
    title: "UN3373 / Biological Substance, Category B SOP",
    description: "UN3373 Category B handling SOP section of the master package.",
    category: "UN3373",
    documentType: "SOP",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-UN3373-001",
  },
  {
    controlledDocumentId: "SC-OPS-001",
    title: "Medical Courier Operations SOP",
    description: "Medical courier operations SOP section of the master package.",
    category: "MEDICAL_COURIER_OPERATIONS",
    documentType: "SOP",
    ownerRole: "OPERATIONS_MANAGER",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-OPS-001",
  },
  {
    controlledDocumentId: "SC-SPEC-001",
    title: "Specialty Shipment SOP Manual",
    description: "Specialty shipment handling SOP. Client written protocols may be required before activation.",
    category: "MEDICAL_COURIER_OPERATIONS",
    documentType: "SOP",
    ownerRole: "OPERATIONS_MANAGER",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-SPEC-001",
  },
  {
    controlledDocumentId: "SC-ERP-001",
    title: "Emergency / Incident Program",
    description: "Standalone Emergency / Incident Program. Prefers Safeway_Couriers_Emergency_Incident_Program.docx as sourceManagedDocument when uploaded.",
    category: "EMERGENCY",
    documentType: "SOP",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-ERP-001",
  },
  {
    controlledDocumentId: "SC-FRM-001",
    title: "Chain of Custody / Courier Transfer Record",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-001",
  },
  {
    controlledDocumentId: "SC-FRM-002",
    title: "Temperature-Controlled Shipment Log",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-002",
  },
  {
    controlledDocumentId: "SC-FRM-003",
    title: "Daily Vehicle Safety & Security Inspection",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-003",
  },
  {
    controlledDocumentId: "SC-FRM-004",
    title: "Spill Kit / PPE Inspection",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-004",
  },
  {
    controlledDocumentId: "SC-FRM-005",
    title: "BBP Exposure Incident Report",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-005",
  },
  {
    controlledDocumentId: "SC-FRM-006",
    title: "HIPAA Privacy/Security Incident Report",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-006",
  },
  {
    controlledDocumentId: "SC-FRM-007",
    title: "Package Damage/Leakage/Nonconformance",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-007",
  },
  {
    controlledDocumentId: "SC-FRM-008",
    title: "Lost/Missing/Misdelivered Shipment",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-008",
  },
  {
    controlledDocumentId: "SC-FRM-009",
    title: "Temperature Excursion",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-009",
  },
  {
    controlledDocumentId: "SC-FRM-010",
    title: "Emergency/Vehicle Accident Initial",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-010",
  },
  {
    controlledDocumentId: "SC-FRM-011",
    title: "Training Attendance & Competency",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-011",
  },
  {
    controlledDocumentId: "SC-FRM-012",
    title: "Hazmat Employee Training Certification",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-012",
  },
  {
    controlledDocumentId: "SC-FRM-013",
    title: "ECP Annual Review",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-013",
  },
  {
    controlledDocumentId: "SC-FRM-014",
    title: "Employee Policy/SOP Acknowledgment",
    description: "Form template only. Not a dynamic form engine. Portal acknowledgments are receipts of review, not legal e-signatures.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-014",
  },
  {
    controlledDocumentId: "SC-FRM-015",
    title: "PPE Issue & Replacement",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-015",
  },
  {
    controlledDocumentId: "SC-FRM-016",
    title: "Cleaning & Decontamination Log",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-016",
  },
  {
    controlledDocumentId: "SC-FRM-017",
    title: "Sharps Injury Log",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-017",
  },
  {
    controlledDocumentId: "SC-FRM-018",
    title: "CAPA Record",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-018",
  },
  {
    controlledDocumentId: "SC-FRM-019",
    title: "Client Shipment Acceptance/Rejection",
    description: "Form template only. Not a dynamic form engine.",
    category: "FORMS_RECORDS",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-019",
  },
  {
    controlledDocumentId: "SC-FRM-020",
    title: "Document Revision / Annual Program Review",
    description: "Form template only. Not a dynamic form engine.",
    category: "DOCUMENT_CONTROL",
    documentType: "FORM",
    ownerRole: "COMPLIANCE_ADMIN",
    approvalAuthority: "Owner / Managing Member",
    sectionReference: "SC-FRM-020",
  },
];

export type ImplementationTaskSeed = {
  key: string;
  title: string;
  description: string;
  category: string;
  sourceControlledDocumentId: string;
  assignedRole: string;
};

export const IMPLEMENTATION_TASK_SEEDS: ImplementationTaskSeed[] = [
  {
    key: "designate_24h_exposure_contact",
    title: "Designate 24-hour exposure contact",
    description: "Name the 24-hour bloodborne pathogens exposure contact. Remains OPEN until an Owner/Admin explicitly completes it.",
    category: "EXPOSURE_CONTROL",
    sourceControlledDocumentId: "SC-ECP-001",
    assignedRole: "OWNER",
  },
  {
    key: "select_occupational_health_provider",
    title: "Select occupational-health provider",
    description: "Select the occupational-health provider used for exposure evaluation and follow-up.",
    category: "EXPOSURE_CONTROL",
    sourceControlledDocumentId: "SC-ECP-001",
    assignedRole: "OWNER",
  },
  {
    key: "enter_provider_address_phone",
    title: "Enter provider address and phone",
    description: "Record the occupational-health provider address and phone number.",
    category: "EXPOSURE_CONTROL",
    sourceControlledDocumentId: "SC-ECP-001",
    assignedRole: "OWNER",
  },
  {
    key: "establish_hep_b_vaccination_scheduling",
    title: "Establish hepatitis B vaccination scheduling procedure",
    description: "Document the procedure for scheduling required hepatitis B vaccination.",
    category: "EXPOSURE_CONTROL",
    sourceControlledDocumentId: "SC-ECP-001",
    assignedRole: "COMPLIANCE_ADMIN",
  },
  {
    key: "establish_employer_payment_medical_services",
    title: "Establish employer payment process for required medical services",
    description: "Document how the company pays for required exposure-related medical services.",
    category: "EXPOSURE_CONTROL",
    sourceControlledDocumentId: "SC-ECP-001",
    assignedRole: "OWNER",
  },
  {
    key: "designate_after_hours_exposure_provider",
    title: "Designate after-hours exposure provider/process",
    description: "Name the after-hours exposure medical provider and process.",
    category: "EXPOSURE_CONTROL",
    sourceControlledDocumentId: "SC-ECP-001",
    assignedRole: "OWNER",
  },
  {
    key: "complete_dot_hmr_function_specific_training",
    title: "Complete DOT/HMR function-specific training as applicable",
    description: "Complete function-specific DOT/HMR training for applicable roles. Remains OPEN; not auto-completed.",
    category: "DOT_HMR",
    sourceControlledDocumentId: "SC-HMR-001",
    assignedRole: "COMPLIANCE_ADMIN",
  },
  {
    key: "complete_dot_hmr_safety_security_driver_training",
    title: "Complete DOT/HMR safety/security/driver training as applicable",
    description: "Complete safety, security, and driver DOT/HMR training for applicable roles. Remains OPEN; not auto-completed.",
    category: "DOT_HMR",
    sourceControlledDocumentId: "SC-HMR-001",
    assignedRole: "COMPLIANCE_ADMIN",
  },
  {
    key: "verify_commercial_business_insurance",
    title: "Verify commercial/business insurance before activating applicable services",
    description: "Verify commercial/business insurance before activating applicable services. Remains OPEN until explicitly completed.",
    category: "INSURANCE",
    sourceControlledDocumentId: "SC-MCM-001",
    assignedRole: "OWNER",
  },
  {
    key: "obtain_owner_controlled_approval_signature",
    title: "Obtain Owner / Managing Member controlled approval signature",
    description: "Owner / Managing Member controlled approval. SIGN is reserved for a future e-sign provider — this task must not be auto-completed and is not a legal e-signature.",
    category: "DOCUMENT_CONTROL",
    sourceControlledDocumentId: "SC-MCM-001",
    assignedRole: "OWNER",
  },
  {
    key: "decide_sharps_rmw_service_activation",
    title: "Decide whether sharps/RMW service will be activated",
    description: "Owner decision whether sharps / regulated medical waste service will be activated. Seeded DEFERRED on the service matrix until this task is explicitly completed.",
    category: "SERVICE_SCOPE",
    sourceControlledDocumentId: "SC-ECP-001",
    assignedRole: "OWNER",
  },
];

export type ServiceMatrixSeed = {
  serviceCode: string;
  serviceName: string;
  status: ServiceAuthorizationStatus;
  activationRule: string;
  sourceControlledDocumentId: string;
  notes: string;
};

/**
 * Service-scope rows from the SC-MCM-001 package as listed in the owner brief
 * (programs, forms, and implementation-task constraints). Statuses are not
 * changed on re-seed. Rows stay inactive until the master file is uploaded
 * and the owner activates them.
 */
export const APPROVED_SERVICE_MATRIX: ServiceMatrixSeed[] = [
  {
    serviceCode: "MED_COURIER_OPS",
    serviceName: "Medical courier operations",
    status: "AUTHORIZED_AFTER_APPLICABLE_TRAINING",
    activationRule: "Required training and SC-OPS-001 SOP/policy acknowledgments before independently performing assigned routes.",
    sourceControlledDocumentId: "SC-OPS-001",
    notes: "SC-MCM-001 package / SC-OPS-001. Inactive until master upload and owner activation.",
  },
  {
    serviceCode: "SPECIALTY_SHIPMENT",
    serviceName: "Specialty shipment handling",
    status: "AUTHORIZED_WITH_WRITTEN_CLIENT_PROTOCOL",
    activationRule: "Written client protocol required in addition to SC-SPEC-001.",
    sourceControlledDocumentId: "SC-SPEC-001",
    notes: "SC-MCM-001 package / SC-SPEC-001. Inactive until master upload and owner activation.",
  },
  {
    serviceCode: "UN3373_CAT_B",
    serviceName: "UN3373 Biological Substance, Category B",
    status: "AUTHORIZED_AFTER_APPLICABLE_TRAINING",
    activationRule: "SC-UN3373-001 SOP and applicable training before assignment.",
    sourceControlledDocumentId: "SC-UN3373-001",
    notes: "SC-MCM-001 package / SC-UN3373-001. Inactive until master upload and owner activation.",
  },
  {
    serviceCode: "DOT_HMR",
    serviceName: "DOT / HMR hazardous materials transportation",
    status: "AUTHORIZED_AFTER_ROLE_TRAINING",
    activationRule: "Function-specific and safety/security/driver training as applicable (implementation tasks remain OPEN).",
    sourceControlledDocumentId: "SC-HMR-001",
    notes: "SC-MCM-001 package / SC-HMR-001. Inactive until master upload and owner activation.",
  },
  {
    serviceCode: "HIPAA_PHI",
    serviceName: "HIPAA Privacy & Security program operations",
    status: "AUTHORIZED_AFTER_APPLICABLE_TRAINING",
    activationRule: "SC-HIP-001 training and acknowledgments before PHI handling.",
    sourceControlledDocumentId: "SC-HIP-001",
    notes: "SC-MCM-001 package / SC-HIP-001. Inactive until master upload and owner activation.",
  },
  {
    serviceCode: "BBP_ECP",
    serviceName: "Bloodborne pathogens / exposure-control work",
    status: "AUTHORIZED_AFTER_APPLICABLE_TRAINING",
    activationRule: "SC-ECP-001 plus open implementation tasks (24-hour contact, occupational health, Hep B, after-hours process).",
    sourceControlledDocumentId: "SC-ECP-001",
    notes: "SC-MCM-001 package / SC-ECP-001. Inactive until master upload and owner activation.",
  },
  {
    serviceCode: "SHARPS_RMW",
    serviceName: "Sharps / regulated medical waste service",
    status: "DEFERRED",
    activationRule: "Owner must decide whether sharps/RMW service will be activated. Not generally available while DEFERRED.",
    sourceControlledDocumentId: "SC-ECP-001",
    notes: "SC-MCM-001 package implementation task: decide whether sharps/RMW service will be activated.",
  },
  {
    serviceCode: "INSURANCE_GATED",
    serviceName: "Services requiring commercial/business insurance verification",
    status: "CONDITIONAL",
    activationRule: "Verify commercial/business insurance before activating applicable services.",
    sourceControlledDocumentId: "SC-MCM-001",
    notes: "SC-MCM-001 package implementation task: verify insurance before activating applicable services.",
  },
  {
    serviceCode: "OWNER_APPROVAL_GATED",
    serviceName: "Services requiring Owner / Managing Member controlled approval",
    status: "CONDITIONAL",
    activationRule: "Obtain Owner / Managing Member controlled approval. Future e-sign only — no fake legal signature.",
    sourceControlledDocumentId: "SC-MCM-001",
    notes: "SC-MCM-001 package implementation task: owner controlled approval signature.",
  },
  {
    serviceCode: "NONCONFORMING_HOLD",
    serviceName: "Damaged / leakage / nonconforming / rejected shipments",
    status: "REJECT_HOLD",
    activationRule: "Hold pending client instruction using SC-FRM-007 and SC-FRM-019. Not generally available.",
    sourceControlledDocumentId: "SC-FRM-007",
    notes: "SC-MCM-001 package forms SC-FRM-007 and SC-FRM-019.",
  },
];

export const GENERALLY_UNAVAILABLE_SERVICE_STATUSES = ["PROHIBITED", "DEFERRED", "REJECT_HOLD"] as const;

export function serviceIsGenerallyAvailable(status: string) {
  return !(GENERALLY_UNAVAILABLE_SERVICE_STATUSES as readonly string[]).includes(status);
}

export function isFormControlledDocument(documentType: string) {
  return documentType === "FORM" || documentType === "TEMPLATE";
}

export function controlledDocumentVisibleToAssignees(status: string, active: boolean) {
  return active && (status === "ACTIVE" || status === "SUPERSEDED");
}
