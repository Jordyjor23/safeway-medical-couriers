import { prisma } from "@/lib/db";

export const PHASE1_REQUIREMENT_SEEDS = [
  { key: "hipaa", name: "HIPAA training", category: "COMPLIANCE", documentType: "HIPAA_TRAINING", sortOrder: 10 },
  { key: "bloodborne_pathogens", name: "Bloodborne Pathogens", category: "COMPLIANCE", documentType: "BLOODBORNE_PATHOGENS", sortOrder: 20 },
  { key: "hazmat_awareness", name: "HazMat General Awareness", category: "COMPLIANCE", documentType: "HAZMAT_HMR_TRAINING", sortOrder: 30 },
  { key: "un3373", name: "UN3373", category: "COMPLIANCE", documentType: "UN3373_TRAINING", sortOrder: 40 },
  { key: "sop_acknowledgement", name: "Internal SOP acknowledgement", category: "COMPLIANCE", documentType: "SIGNED_POLICY", sortOrder: 50 },
  { key: "driver_qualification", name: "Driver qualification", category: "HR", documentType: "DRIVERS_LICENSE", sortOrder: 60, expirationRequired: true },
  { key: "insurance", name: "Insurance", category: "COMPLIANCE", documentType: "AUTO_INSURANCE", sortOrder: 70, expirationRequired: true },
  { key: "vehicle_registration", name: "Vehicle registration", category: "COMPLIANCE", documentType: "VEHICLE_REGISTRATION", sortOrder: 80, expirationRequired: true },
  { key: "osha", name: "OSHA-related training", category: "COMPLIANCE", documentType: "OSHA_TRAINING", sortOrder: 90 },
  { key: "mvr_authorization", name: "MVR authorization", category: "HR", documentType: "MVR_AUTHORIZATION", sortOrder: 100 },
  { key: "background_authorization", name: "Background-check authorization", category: "HR", documentType: "BACKGROUND_AUTHORIZATION", sortOrder: 110 },
  { key: "company_training", name: "Company training", category: "COMPLIANCE", documentType: "COMPANY_TRAINING", sortOrder: 120 },
  { key: "confidentiality", name: "Confidentiality acknowledgement", category: "HR", documentType: "CONFIDENTIALITY_ACK", sortOrder: 130 },
  { key: "resume", name: "Resume", category: "APPLICANT", documentType: "RESUME", sortOrder: 5, defaultRequired: true },
] as const;

export const PHASE1_DOCUMENT_RULES: { key: string; documentType: string; appliesTo: string }[] = [
  { key: "hipaa", documentType: "HIPAA_TRAINING", appliesTo: "ALL" },
  { key: "bloodborne_pathogens", documentType: "BLOODBORNE_PATHOGENS", appliesTo: "ALL" },
  { key: "hazmat_awareness", documentType: "HAZMAT_HMR_TRAINING", appliesTo: "ALL" },
  { key: "un3373", documentType: "UN3373_TRAINING", appliesTo: "ALL" },
  { key: "sop_acknowledgement", documentType: "SIGNED_POLICY", appliesTo: "ALL" },
  { key: "driver_qualification", documentType: "DRIVERS_LICENSE", appliesTo: "DRIVER" },
  { key: "insurance", documentType: "AUTO_INSURANCE", appliesTo: "DRIVER" },
  { key: "vehicle_registration", documentType: "VEHICLE_REGISTRATION", appliesTo: "DRIVER" },
  { key: "osha", documentType: "OSHA_TRAINING", appliesTo: "ALL" },
  { key: "mvr_authorization", documentType: "MVR_AUTHORIZATION", appliesTo: "DRIVER" },
  { key: "background_authorization", documentType: "BACKGROUND_AUTHORIZATION", appliesTo: "ALL" },
  { key: "company_training", documentType: "COMPANY_TRAINING", appliesTo: "ALL" },
  { key: "confidentiality", documentType: "CONFIDENTIALITY_ACK", appliesTo: "ALL" },
  { key: "resume", documentType: "RESUME", appliesTo: "APPLICANT" },
];

export async function seedPhase1Requirements() {
  for (const requirement of PHASE1_REQUIREMENT_SEEDS) {
    await prisma.complianceRequirement.upsert({
      where: { key: requirement.key },
      update: {
        name: requirement.name,
        category: requirement.category,
        documentType: requirement.documentType,
        expirationRequired: "expirationRequired" in requirement ? requirement.expirationRequired : false,
        active: true,
      },
      create: {
        key: requirement.key,
        name: requirement.name,
        category: requirement.category,
        documentType: requirement.documentType,
        defaultRequired: "defaultRequired" in requirement ? requirement.defaultRequired : true,
        expirationRequired: "expirationRequired" in requirement ? requirement.expirationRequired : false,
        sortOrder: requirement.sortOrder,
      },
    });
  }

  const requirementRows = await prisma.complianceRequirement.findMany();
  const requirementByKey = new Map(requirementRows.map((row) => [row.key, row.id]));
  for (const rule of PHASE1_DOCUMENT_RULES) {
    const requirementId = requirementByKey.get(rule.key);
    if (!requirementId) continue;
    await prisma.documentRequirementRule.upsert({
      where: {
        requirementId_documentType_appliesTo: {
          requirementId,
          documentType: rule.documentType,
          appliesTo: rule.appliesTo,
        },
      },
      update: {},
      create: {
        requirementId,
        documentType: rule.documentType,
        appliesTo: rule.appliesTo,
      },
    });
  }
}

export async function assignDefaultApplicantRequirements(args: {
  applicantId: string;
  applicationId: string;
  jobOpeningId: string;
  assignedById?: string | null;
}) {
  const job = await prisma.jobOpening.findUnique({
    where: { id: args.jobOpeningId },
    include: { category: true },
  });
  const driving = Boolean(job?.requiresDriversLicense || job?.category?.requiresDriving);
  const requirements = await prisma.complianceRequirement.findMany({
    where: { active: true, defaultRequired: true },
    include: { documentRules: true },
  });

  for (const requirement of requirements) {
    const applicantRule = requirement.documentRules.some((rule) => rule.appliesTo === "APPLICANT" || rule.appliesTo === "ALL");
    const driverOnly = requirement.documentRules.every((rule) => rule.appliesTo === "DRIVER") && requirement.documentRules.length > 0;
    if (driverOnly && !driving) continue;
    if (!applicantRule && !driverOnly && requirement.key !== "resume") continue;

    const existing = await prisma.requirementAssignment.findFirst({
      where: {
        requirementId: requirement.id,
        applicationId: args.applicationId,
        active: true,
      },
    });
    if (existing) continue;
    await prisma.requirementAssignment.create({
      data: {
        requirementId: requirement.id,
        audience: "APPLICANT",
        applicantId: args.applicantId,
        applicationId: args.applicationId,
        jobOpeningId: args.jobOpeningId,
        assignedById: args.assignedById ?? null,
      },
    });
  }
}

export async function assignRequirement(args: {
  requirementId: string;
  audience: "APPLICANT" | "EMPLOYEE" | "JOB" | "MANUAL";
  applicantId?: string;
  employeeId?: string;
  applicationId?: string;
  jobOpeningId?: string;
  assignedById?: string | null;
}) {
  const existing = await prisma.requirementAssignment.findFirst({
    where: {
      requirementId: args.requirementId,
      applicantId: args.applicantId ?? null,
      employeeId: args.employeeId ?? null,
      applicationId: args.applicationId ?? null,
      jobOpeningId: args.jobOpeningId ?? null,
      active: true,
    },
  });
  if (existing) return existing;
  return prisma.requirementAssignment.create({
    data: {
      requirementId: args.requirementId,
      audience: args.audience,
      applicantId: args.applicantId,
      employeeId: args.employeeId,
      applicationId: args.applicationId,
      jobOpeningId: args.jobOpeningId,
      assignedById: args.assignedById ?? null,
    },
  });
}
