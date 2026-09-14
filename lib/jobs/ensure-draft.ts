import { prisma } from "@/lib/db";
import { createPublicJobId } from "@/lib/ids";

export const MEDICAL_COURIER_DRIVER_TITLE = "Medical Courier Driver";

// Owner-approved draft defaults: W-2 / FULL_TIME; personal vehicle + current
// auto insurance required; Columbus / Central Ohio; pay language below is
// owner-approved. Status stays DRAFT. Do not auto-publish. Do not overwrite
// PUBLISHED / PAUSED / CLOSED / ARCHIVED postings. HazMat is route/role
// dependent and is not a universal apply-time requirement.

export const MEDICAL_COURIER_COMPENSATION_NOTES =
  "$20.00–$23.00/hour depending on experience and qualifications. Approved business mileage reimbursed at $0.76 per mile.";

export const MEDICAL_COURIER_LOCATION = "Columbus, Ohio / Central Ohio service area";

export const MEDICAL_COURIER_VEHICLE_REQUIREMENTS =
  "A reliable personal vehicle, valid driver's license, and current automobile insurance are required. Vehicle must be maintained in safe operating condition.";

export const MEDICAL_COURIER_SCHEDULE =
  "Full-time. Schedule varies by assigned route and operational needs and may include daytime, evening, overnight, weekend, holiday, and on-call assignments.";

const DEFAULT_JOB_REQUIREMENT_KEYS = [
  "resume",
  "driver_qualification",
  "insurance",
  "hipaa",
  "bloodborne_pathogens",
  "sop_acknowledgement",
  "background_authorization",
  "mvr_authorization",
] as const;

export const MEDICAL_COURIER_DRIVER_QUESTIONS = [
  { prompt: "Do you currently hold a valid driver's license?", required: true, sortOrder: 0 },
  { prompt: "Do you have access to a reliable personal vehicle that you are authorized to use for work?", required: true, sortOrder: 1 },
  { prompt: "Can you provide proof of current automobile insurance before beginning driving assignments?", required: true, sortOrder: 2 },
  { prompt: "Are you willing to complete a motor vehicle record check and background screening as permitted by law?", required: true, sortOrder: 3 },
  { prompt: "Are you able to work assigned routes that may include evenings, weekends, overnight hours, or on-call coverage?", required: true, sortOrder: 4 },
  { prompt: "Are you willing to complete Safeway Couriers' required training and policy/SOP acknowledgments?", required: true, sortOrder: 5 },
  {
    prompt:
      "Do you have prior medical courier, healthcare logistics, specimen transport, pharmacy delivery, or professional delivery experience?",
    required: false,
    sortOrder: 6,
  },
] as const;

export function shouldUpdateMedicalCourierDraft(status: string) {
  return status === "DRAFT";
}

export function medicalCourierDriverDraftFields() {
  return {
    title: MEDICAL_COURIER_DRIVER_TITLE,
    department: "Operations",
    employmentType: "FULL_TIME" as const,
    workerClassification: "EMPLOYEE" as const,
    location: MEDICAL_COURIER_LOCATION,
    workArrangement: "ONSITE" as const,
    payType: "HOURLY" as const,
    compensationMin: 20,
    compensationMax: 23,
    compensationNotes: MEDICAL_COURIER_COMPENSATION_NOTES,
    description:
      "Deliver time-sensitive medical materials for healthcare customers following Safeway Couriers procedures. This W-2 role requires a reliable personal vehicle, a valid driver's license, and current automobile insurance.",
    essentialDuties:
      "Complete assigned medical courier routes using a personal vehicle; protect the chain of custody; follow temperature and specimen-handling instructions when provided; report incidents; complete required company documents and training as assigned.",
    minimumQualifications:
      "Valid driver's license, a reliable personal vehicle you are authorized to use for work, and current automobile insurance. Ability to follow written procedures. Required certifications and documents are configured on this posting and assigned at apply time.",
    preferredQualifications:
      "Prior medical courier, healthcare logistics, specimen transport, pharmacy delivery, or professional delivery experience.",
    schedule: MEDICAL_COURIER_SCHEDULE,
    requiredCertifications:
      "Driver's license, current automobile insurance for a personal vehicle, HIPAA training, bloodborne pathogens training, company SOP/policy acknowledgments, and background/MVR authorization. HazMat awareness and other specialty-handling training may be assigned later by route or role and are not required of every applicant.",
    requiresDriversLicense: true,
    vehicleRequirements: MEDICAL_COURIER_VEHICLE_REQUIREMENTS,
    backgroundCheckRequired: true,
    mvrRequired: true,
    status: "DRAFT" as const,
  };
}

export async function ensureMedicalCourierDriverDraft() {
  const existing = await prisma.jobOpening.findFirst({
    where: { title: { equals: MEDICAL_COURIER_DRIVER_TITLE, mode: "insensitive" } },
    select: { id: true, status: true, title: true },
  });

  if (existing && !shouldUpdateMedicalCourierDraft(existing.status)) {
    return {
      created: false as const,
      updated: false as const,
      skipped: true as const,
      jobId: existing.id,
      status: existing.status,
      reason: "existing_non_draft",
    };
  }

  const category = await prisma.careerCategory.upsert({
    where: { slug: "medical-courier" },
    update: {
      compensationDisplay: MEDICAL_COURIER_COMPENSATION_NOTES,
    },
    create: {
      slug: "medical-courier",
      name: "Medical Courier",
      opportunityType: "EMPLOYMENT",
      compensationDisplay: MEDICAL_COURIER_COMPENSATION_NOTES,
      summary: "Scheduled and on-demand medical deliveries for healthcare organizations.",
      sortOrder: 10,
      requiresDriving: true,
      isMedicalCourier: true,
    },
  });

  if (existing) {
    await prisma.jobOpening.update({
      where: { id: existing.id },
      data: {
        ...medicalCourierDriverDraftFields(),
        categoryId: category.id,
      },
    });
    await syncDraftQuestionsAndRequirements(existing.id);
    return {
      created: false as const,
      updated: true as const,
      skipped: false as const,
      jobId: existing.id,
      status: "DRAFT" as const,
    };
  }

  const job = await prisma.jobOpening.create({
    data: {
      publicId: createPublicJobId(),
      categoryId: category.id,
      ...medicalCourierDriverDraftFields(),
    },
  });
  await syncDraftQuestionsAndRequirements(job.id);
  return { created: true as const, updated: false as const, skipped: false as const, jobId: job.id, status: job.status };
}

async function syncDraftQuestionsAndRequirements(jobId: string) {
  await prisma.jobQuestion.deleteMany({ where: { jobOpeningId: jobId } });
  await prisma.jobQuestion.createMany({
    data: MEDICAL_COURIER_DRIVER_QUESTIONS.map((question) => ({
      jobOpeningId: jobId,
      prompt: question.prompt,
      required: question.required,
      sortOrder: question.sortOrder,
    })),
  });

  const requirements = await prisma.complianceRequirement.findMany({
    where: { key: { in: [...DEFAULT_JOB_REQUIREMENT_KEYS] } },
  });
  await prisma.requirementAssignment.deleteMany({
    where: { jobOpeningId: jobId, audience: "JOB" },
  });
  if (requirements.length) {
    await prisma.requirementAssignment.createMany({
      data: requirements.map((requirement) => ({
        requirementId: requirement.id,
        audience: "JOB" as const,
        jobOpeningId: jobId,
        active: true,
      })),
    });
  }
}

export function defaultMedicalCourierRequirementKeys() {
  return [...DEFAULT_JOB_REQUIREMENT_KEYS];
}
