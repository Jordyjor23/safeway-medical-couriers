import type { CompanyLibraryCategory, ControlledDocumentType, ServiceAuthorizationStatus } from "@prisma/client";

export const SC_MCM_PACKAGE_KEY = "SC-MCM-001";
export const SC_MCM_MASTER_ID = "SC-MCM-001";

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
    description: "Master source package for Safeway Couriers compliance and operations. Child controlled records share this file after upload — no duplicate Blob objects.",
    category: "CORPORATE_GOVERNANCE",
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
    description: "Emergency and incident response program section of the master package.",
    category: "EMERGENCY",
    documentType: "PROGRAM",
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
