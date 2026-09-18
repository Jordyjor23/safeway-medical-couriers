export type RouteQualificationInput = {
  requiredTrainingKeys?: string | null;
  requiredCertificationNames?: string | null;
  vehicleRequirement?: string | null;
};

export type EmployeeQualificationInput = {
  status: string;
  isDriver: boolean;
  trainings: {
    requirementKey: string;
    title: string;
    completedAt: Date | null;
    expiresAt: Date | null;
  }[];
  certifications: {
    name: string;
    expiresAt: Date | null;
  }[];
  complianceRecords: {
    status: string;
    expiresAt: Date | null;
    requirement: { key: string; name: string };
  }[];
  documents: {
    document: {
      name: string;
      documentType: string | null;
      verificationStatus: string;
      lifecycleStatus: string;
      expirationDate: Date | null;
      archivedAt: Date | null;
    };
  }[];
  vehicle: { vehicleType: string } | null;
};

function csv(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeRequirement(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function requirementMatches(required: string, values: string[]) {
  const wanted = normalizeRequirement(required);
  const base = wanted.replace(/_TRAINING$/, "");
  return values.some((value) => {
    const normalized = normalizeRequirement(value);
    return (
      normalized === wanted ||
      normalized === base ||
      normalized.includes(base) ||
      base.includes(normalized)
    );
  });
}

const TRAINING_DOCUMENT_ALIASES: Record<string, string[]> = {
  HIPAA: ["HIPAA_TRAINING"],
  HIPAA_TRAINING: ["HIPAA_TRAINING"],
  BLOODBORNE_PATHOGENS: ["BLOODBORNE_PATHOGENS"],
  HAZMAT: ["HAZMAT_HMR_TRAINING"],
  HMR: ["HAZMAT_HMR_TRAINING"],
  HAZMAT_HMR: ["HAZMAT_HMR_TRAINING"],
  HAZMAT_HMR_TRAINING: ["HAZMAT_HMR_TRAINING"],
  UN3373: ["UN3373_TRAINING"],
  UN3373_TRAINING: ["UN3373_TRAINING"],
  OSHA: ["OSHA_TRAINING"],
  OSHA_TRAINING: ["OSHA_TRAINING"],
  CHAIN_OF_CUSTODY: ["CHAIN_OF_CUSTODY"],
  TEMPERATURE_CONTROL: ["TEMPERATURE_CERTIFICATION"],
  TEMPERATURE_CONTROLLED: ["TEMPERATURE_CERTIFICATION"],
  TEMPERATURE_CERTIFICATION: ["TEMPERATURE_CERTIFICATION"],
};

function verifiedCredentialDocuments(employee: EmployeeQualificationInput, at: Date) {
  return employee.documents
    .map((link) => link.document)
    .filter(
      (document) =>
        document.verificationStatus === "VERIFIED" &&
        document.lifecycleStatus === "VERIFIED" &&
        !document.archivedAt &&
        (!document.expirationDate || document.expirationDate >= at),
    );
}

function documentMatchesTraining(documentType: string | null, requirement: string) {
  if (!documentType) return false;
  const wanted = normalizeRequirement(requirement);
  const aliases = TRAINING_DOCUMENT_ALIASES[wanted] ?? [wanted, wanted.replace(/_TRAINING$/, "")];
  const type = normalizeRequirement(documentType);
  return aliases.some((alias) => normalizeRequirement(alias) === type);
}

export function evaluateEmployeeRouteQualification(
  employee: EmployeeQualificationInput,
  route: RouteQualificationInput,
  at = new Date(),
) {
  const reasons: string[] = [];
  const evidence: string[] = [];
  const documents = verifiedCredentialDocuments(employee, at);

  if (!employee.isDriver) reasons.push("not marked as a courier/driver");
  if (employee.status !== "ACTIVE") reasons.push("employee status is not active");

  for (const key of csv(route.requiredTrainingKeys)) {
    const trainingMatch = employee.trainings.find(
      (training) =>
        requirementMatches(key, [training.requirementKey, training.title]) &&
        Boolean(training.completedAt) &&
        (!training.expiresAt || training.expiresAt >= at),
    );
    const complianceMatch = employee.complianceRecords.find(
      (record) =>
        requirementMatches(key, [record.requirement.key, record.requirement.name]) &&
        ["CURRENT", "EXPIRING_SOON"].includes(record.status) &&
        (!record.expiresAt || record.expiresAt >= at),
    );
    const documentMatch = documents.find((document) =>
      documentMatchesTraining(document.documentType, key),
    );

    if (trainingMatch) evidence.push(trainingMatch.title);
    else if (complianceMatch) evidence.push(complianceMatch.requirement.name);
    else if (documentMatch) evidence.push(documentMatch.name);
    else reasons.push(`missing/expired training: ${key}`);
  }

  for (const name of csv(route.requiredCertificationNames)) {
    const certificationMatch = employee.certifications.find(
      (certification) =>
        requirementMatches(name, [certification.name]) &&
        (!certification.expiresAt || certification.expiresAt >= at),
    );
    const documentMatch = documents.find(
      (document) =>
        ["OTHER_CERTIFICATION", "TEMPERATURE_CERTIFICATION"].includes(
          document.documentType ?? "",
        ) && requirementMatches(name, [document.name, document.documentType ?? ""]),
    );

    if (certificationMatch) evidence.push(certificationMatch.name);
    else if (documentMatch) evidence.push(documentMatch.name);
    else reasons.push(`missing/expired certification: ${name}`);
  }

  const vehicleRequirement = route.vehicleRequirement?.trim();
  if (
    vehicleRequirement &&
    vehicleRequirement.toLowerCase() !== "any" &&
    !employee.vehicle?.vehicleType?.toLowerCase().includes(vehicleRequirement.toLowerCase())
  ) {
    reasons.push(`vehicle requirement: ${vehicleRequirement}`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    evidence: [...new Set(evidence)],
  };
}
