export type OnboardingDocumentRequirement = {
  type: string;
  label: string;
  sensitive?: boolean;
};

const sharedTraining: OnboardingDocumentRequirement[] = [
  { type: "HIPAA_TRAINING", label: "HIPAA training certificate" },
  { type: "BLOODBORNE_PATHOGENS", label: "Bloodborne Pathogens certificate" },
];

const driverDocuments: OnboardingDocumentRequirement[] = [
  { type: "DRIVERS_LICENSE", label: "Driver's license", sensitive: true },
  { type: "AUTO_INSURANCE", label: "Auto insurance" },
  { type: "VEHICLE_REGISTRATION", label: "Vehicle registration" },
];

export function employeeOnboardingDocumentRequirements(args: {
  classification: "W2_EMPLOYEE" | "INDEPENDENT_CONTRACTOR";
  isDriver: boolean;
}) {
  const base: OnboardingDocumentRequirement[] =
    args.classification === "INDEPENDENT_CONTRACTOR"
      ? [
          { type: "W9", label: "W-9", sensitive: true },
          ...sharedTraining,
        ]
      : [
          { type: "EMPLOYMENT_ELIGIBILITY", label: "Employment eligibility / I-9 supporting document", sensitive: true },
          { type: "W4", label: "W-4", sensitive: true },
          { type: "DIRECT_DEPOSIT", label: "Direct-deposit form", sensitive: true },
          { type: "EMERGENCY_CONTACT", label: "Emergency contact" },
          ...sharedTraining,
        ];

  return args.isDriver ? [...base, ...driverDocuments] : base;
}

export function applicantOnboardingDocumentTypes(args: {
  workerClassification: "EMPLOYEE" | "INDEPENDENT_CONTRACTOR";
  requiresDriving: boolean;
}) {
  const base =
    args.workerClassification === "INDEPENDENT_CONTRACTOR"
      ? ["W9", "HIPAA_TRAINING", "BLOODBORNE_PATHOGENS", "OTHER_CERTIFICATION"]
      : ["EMPLOYMENT_ELIGIBILITY", "W4", "HIPAA_TRAINING", "BLOODBORNE_PATHOGENS", "OTHER_CERTIFICATION"];
  return args.requiresDriving
    ? [...base, "DRIVERS_LICENSE", "STATE_ID", "AUTO_INSURANCE", "VEHICLE_REGISTRATION"]
    : [...base, "STATE_ID"];
}

export const SENSITIVE_ONBOARDING_DOCUMENT_TYPES = new Set([
  "DRIVERS_LICENSE",
  "STATE_ID",
  "EMPLOYMENT_ELIGIBILITY",
  "W9",
  "W4",
  "DIRECT_DEPOSIT",
]);
