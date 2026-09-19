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

export function applicantOnboardingDocumentRequirements(args: {
  workerClassification: "EMPLOYEE" | "INDEPENDENT_CONTRACTOR";
  requiresDriving: boolean;
}) {
  const base: OnboardingDocumentRequirement[] =
    args.workerClassification === "INDEPENDENT_CONTRACTOR"
      ? [
          { type: "W9", label: "W-9", sensitive: true },
          ...sharedTraining,
        ]
      : [...sharedTraining];

  return args.requiresDriving ? [...base, ...driverDocuments] : base;
}

export function applicantOnboardingDocumentTypes(args: {
  workerClassification: "EMPLOYEE" | "INDEPENDENT_CONTRACTOR";
  requiresDriving: boolean;
}) {
  const required = applicantOnboardingDocumentRequirements(args).map((item) => item.type);
  return [...new Set([...required, "OTHER_CERTIFICATION"])];
}

export const SENSITIVE_ONBOARDING_DOCUMENT_TYPES = new Set([
  "DRIVERS_LICENSE",
  "STATE_ID",
  "EMPLOYMENT_ELIGIBILITY",
  "W9",
  "W4",
  "DIRECT_DEPOSIT",
]);
