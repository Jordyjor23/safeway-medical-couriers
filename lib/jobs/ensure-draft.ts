import { prisma } from "@/lib/db";
import { createPublicJobId } from "@/lib/ids";

export const MEDICAL_COURIER_DRIVER_TITLE = "Medical Courier Driver";

const DEFAULT_JOB_REQUIREMENT_KEYS = [
  "resume",
  "driver_qualification",
  "insurance",
  "hipaa",
  "bloodborne_pathogens",
  "sop_acknowledgement",
  "background_authorization",
  "mvr_authorization",
  "hazmat_awareness",
] as const;

export async function ensureMedicalCourierDriverDraft() {
  const existing = await prisma.jobOpening.findFirst({
    where: { title: { equals: MEDICAL_COURIER_DRIVER_TITLE, mode: "insensitive" } },
    select: { id: true, status: true, title: true },
  });
  if (existing) {
    return { created: false as const, jobId: existing.id, status: existing.status };
  }

  const category = await prisma.careerCategory.upsert({
    where: { slug: "medical-courier" },
    update: {},
    create: {
      slug: "medical-courier",
      name: "Medical Courier",
      opportunityType: "EMPLOYMENT",
      compensationDisplay: "Set by owner before publishing",
      summary: "Scheduled and on-demand medical deliveries for healthcare organizations.",
      sortOrder: 10,
      requiresDriving: true,
      isMedicalCourier: true,
    },
  });

  const job = await prisma.jobOpening.create({
    data: {
      publicId: createPublicJobId(),
      title: MEDICAL_COURIER_DRIVER_TITLE,
      department: "Operations",
      categoryId: category.id,
      employmentType: "FULL_TIME",
      workerClassification: "EMPLOYEE",
      location: "Service area — set by owner before publishing",
      workArrangement: "ONSITE",
      payType: "HOURLY",
      compensationNotes: null,
      description:
        "Deliver time-sensitive medical materials for healthcare customers following Safeway Couriers procedures. Owner must complete compensation, location, and legal employment terms before publishing.",
      essentialDuties:
        "Complete assigned medical courier routes; protect the chain of custody; follow temperature and specimen-handling instructions when provided; report incidents; complete required company documents and training as assigned.",
      minimumQualifications:
        "Valid driver's license. Ability to follow written procedures. Required certifications and documents are configured on this posting and assigned at apply time.",
      preferredQualifications: "Prior medical courier or healthcare logistics experience.",
      schedule: "Owner-configured. Shift options include day, evening, overnight, weekend, rotating, and on-call / STAT.",
      requiredCertifications:
        "Owner-configured. Typical medical courier tracking includes driver's license, auto insurance when a personal vehicle is used, HIPAA training, bloodborne pathogens training, company SOP acknowledgment, background/MVR authorization, and HazMat awareness where applicable.",
      requiresDriversLicense: true,
      vehicleRequirements: "Personal or company vehicle requirements are set by the owner before publishing.",
      backgroundCheckRequired: true,
      mvrRequired: true,
      status: "DRAFT",
      questions: {
        create: [
          { prompt: "Do you have a valid driver's license?", required: true, sortOrder: 0 },
          { prompt: "If you would use a personal vehicle, can you provide current auto insurance?", required: true, sortOrder: 1 },
          { prompt: "Are you able to complete required company training and document acknowledgments if hired?", required: true, sortOrder: 2 },
        ],
      },
    },
  });

  const requirements = await prisma.complianceRequirement.findMany({
    where: { key: { in: [...DEFAULT_JOB_REQUIREMENT_KEYS] } },
  });
  if (requirements.length) {
    await prisma.requirementAssignment.createMany({
      data: requirements.map((requirement) => ({
        requirementId: requirement.id,
        audience: "JOB" as const,
        jobOpeningId: job.id,
        active: true,
      })),
    });
  }

  return { created: true as const, jobId: job.id, status: job.status };
}

export function defaultMedicalCourierRequirementKeys() {
  return [...DEFAULT_JOB_REQUIREMENT_KEYS];
}
