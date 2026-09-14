import { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import {
  applicationDraftSchema,
  applicationInputSchema,
  assertNoForbiddenApplicationKeys,
  type ApplicationDraftInput,
  type ApplicationInput,
} from "@/lib/application-schema";
import { applicantSafeStatusLabel } from "@/lib/applications/status";
import { decideApplicationWrite, decideDraftWrite } from "@/lib/applications/identity";
import { ensureApplicantProfile } from "@/lib/applicant-account";
import { createTrackingNumber } from "@/lib/ids";
import { prisma } from "@/lib/db";
import { assignDefaultApplicantRequirements } from "@/lib/compliance/requirements";

function applicationFieldData(data: ApplicationDraftInput | ApplicationInput) {
  return {
    preferredEmploymentType: data.preferredEmploymentType ?? null,
    availableStartDate: data.availableStartDate ? new Date(data.availableStartDate) : null,
    generalAvailability: data.generalAvailability ?? null,
    preferredShift: data.preferredShift ?? null,
    fullTimePreference: data.fullTimePreference ?? null,
    serviceAreas: data.serviceAreas ?? null,
    weekdays: data.weekdays ?? false,
    weekends: data.weekends ?? false,
    holidays: data.holidays ?? false,
    earlyMornings: data.earlyMornings ?? false,
    evenings: data.evenings ?? false,
    overnight: data.overnight ?? false,
    onCallStat: data.onCallStat ?? false,
    authorizedToWorkUs: data.authorizedToWorkUs ?? null,
    requiresSponsorship: data.requiresSponsorship ?? null,
    highestEducation: data.highestEducation ?? null,
    relevantTraining: data.relevantTraining ?? null,
    licenses: data.licenses ?? null,
    certifications: data.certifications ?? null,
    courierExperience: data.courierExperience ?? null,
    healthcareLogisticsExperience: data.healthcareLogisticsExperience ?? null,
    customerServiceExperience: data.customerServiceExperience ?? null,
    dispatchExperience: data.dispatchExperience ?? null,
    technologyExperience: data.technologyExperience ?? null,
    canPerformEssentialFunctions: data.canPerformEssentialFunctions ?? null,
    hipaaTraining: data.hipaaTraining ?? false,
    bloodbornePathogensTraining: data.bloodbornePathogensTraining ?? false,
    hazmatAwarenessTraining: data.hazmatAwarenessTraining ?? false,
    un3373Training: data.un3373Training ?? false,
    chainOfCustodyTraining: data.chainOfCustodyTraining ?? false,
    temperatureControlledExperience: data.temperatureControlledExperience ?? false,
    pharmaceuticalDeliveryExperience: data.pharmaceuticalDeliveryExperience ?? false,
    laboratoryCourierExperience: data.laboratoryCourierExperience ?? false,
    hasValidDriversLicense: data.hasValidDriversLicense ?? null,
    licenseIssuingState: data.licenseIssuingState ?? null,
    licenseClass: data.licenseClass ?? null,
    canMeetDrivingRequirements: data.canMeetDrivingRequirements ?? null,
    hasPersonalVehicle: data.hasPersonalVehicle ?? null,
    vehicleType: data.vehicleType ?? null,
    proofOfInsurance: data.proofOfInsurance ?? null,
    canUseGpsApps: data.canUseGpsApps ?? null,
    relevantCourierDrivingExperience: data.relevantCourierDrivingExperience ?? null,
    draftPayload: data as Prisma.InputJsonValue,
  };
}

async function uniqueTrackingNumber() {
  let trackingNumber = createTrackingNumber();
  for (let i = 0; i < 5; i += 1) {
    const exists = await prisma.application.findUnique({ where: { trackingNumber } });
    if (!exists) return trackingNumber;
    trackingNumber = createTrackingNumber();
  }
  return trackingNumber;
}

export async function saveApplicantDraft(args: {
  userId: string;
  payload: unknown;
}) {
  if (!args.payload || typeof args.payload !== "object") {
    return { error: "Invalid application." };
  }
  try {
    assertNoForbiddenApplicationKeys(args.payload as Record<string, unknown>);
  } catch {
    return { error: "Invalid application." };
  }
  const parsed = applicationDraftSchema.safeParse(args.payload);
  if (!parsed.success) return { error: "Please check the required fields and try again." };

  const applicant = await ensureApplicantProfile(args.userId);
  if (!applicant) return { error: "Not found." };

  const data = parsed.data;
  const job = await prisma.jobOpening.findFirst({
    where: { publicId: data.jobPublicId, status: "PUBLISHED" },
  });
  if (!job) return { error: "That position is not available." };

  if (data.legalFirstName || data.legalLastName || data.phone || data.city || data.state || data.zip) {
    await prisma.applicant.update({
      where: { id: applicant.id },
      data: {
        legalFirstName: data.legalFirstName || applicant.legalFirstName,
        middleName: data.middleName ?? applicant.middleName,
        legalLastName: data.legalLastName || applicant.legalLastName,
        preferredName: data.preferredName ?? applicant.preferredName,
        phone: data.phone || applicant.phone,
        city: data.city || applicant.city,
        state: data.state || applicant.state,
        zip: data.zip || applicant.zip,
      },
    });
  }

  const existingForJob = await prisma.application.findFirst({
    where: { applicantId: applicant.id, jobOpeningId: job.id },
    orderBy: { createdAt: "desc" },
  });
  const decision = decideDraftWrite(existingForJob);
  if (decision.action === "reuse") {
    const existing = existingForJob!;
    return {
      ok: true as const,
      application: {
        id: existing.id,
        trackingNumber: existing.trackingNumber,
        status: existing.status,
        statusLabel: applicantSafeStatusLabel(existing.status),
      },
    };
  }

  const existing = decision.action === "update_draft" ? existingForJob : null;

  const application = existing
    ? await prisma.application.update({
        where: { id: existing.id },
        data: applicationFieldData(data),
      })
    : await prisma.application.create({
        data: {
          trackingNumber: await uniqueTrackingNumber(),
          applicantId: applicant.id,
          jobOpeningId: job.id,
          status: "DRAFT",
          ...applicationFieldData(data),
          statusHistory: {
            create: { toStatus: "DRAFT", changedBy: args.userId, note: "Draft saved" },
          },
        },
      });

  if (!existing) {
    await assignDefaultApplicantRequirements({
      applicantId: applicant.id,
      applicationId: application.id,
      jobOpeningId: job.id,
    });
    await writeAuditLog({
      actorId: args.userId,
      action: "application.draft.created",
      targetType: "application",
      targetId: application.id,
      metadata: { jobPublicId: job.publicId },
    });
  } else {
    await writeAuditLog({
      actorId: args.userId,
      action: "application.draft.saved",
      targetType: "application",
      targetId: application.id,
    });
  }

  return {
    ok: true as const,
    application: {
      id: application.id,
      trackingNumber: application.trackingNumber,
      status: application.status,
      statusLabel: applicantSafeStatusLabel(application.status),
    },
  };
}

export async function submitApplicantApplication(args: {
  userId: string;
  payload: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  if (!args.payload || typeof args.payload !== "object") {
    return { error: "Invalid application." };
  }
  try {
    assertNoForbiddenApplicationKeys(args.payload as Record<string, unknown>);
  } catch {
    return { error: "Invalid application." };
  }
  const parsed = applicationInputSchema.safeParse(args.payload);
  if (!parsed.success) return { error: "Please check the required fields and try again." };

  const applicant = await ensureApplicantProfile(args.userId);
  if (!applicant) return { error: "Not found." };

  const data = parsed.data;
  const job = await prisma.jobOpening.findFirst({
    where: { publicId: data.jobPublicId, status: "PUBLISHED" },
    include: { questions: true },
  });
  if (!job) return { error: "That position is not available." };

  const [ackDoc, privacyDoc] = await Promise.all([
    prisma.legalDocument.findFirst({ where: { slug: "application-acknowledgement", isCurrent: true } }),
    prisma.legalDocument.findFirst({ where: { slug: "applicant-privacy", isCurrent: true } }),
  ]);
  if (!ackDoc || !privacyDoc) {
    return { error: "Application notices are not configured." };
  }

  await prisma.applicant.update({
    where: { id: applicant.id },
    data: {
      legalFirstName: data.legalFirstName,
      middleName: data.middleName,
      legalLastName: data.legalLastName,
      preferredName: data.preferredName,
      phone: data.phone,
      city: data.city,
      state: data.state,
      zip: data.zip,
    },
  });

  const existingForJob = await prisma.application.findFirst({
    where: { applicantId: applicant.id, jobOpeningId: job.id },
    orderBy: { createdAt: "desc" },
  });
  const decision = decideApplicationWrite({
    mode: "authenticated",
    applicantUserId: args.userId,
    existingForJob,
  });
  if (decision.action === "reuse" && existingForJob) {
    return {
      ok: true as const,
      application: {
        id: existingForJob.id,
        trackingNumber: existingForJob.trackingNumber,
        status: existingForJob.status,
        statusLabel: applicantSafeStatusLabel(existingForJob.status),
        submittedAt: existingForJob.submittedAt,
      },
    };
  }

  const draft = decision.action === "submit_draft" ? existingForJob : null;

  const application = draft
    ? await prisma.application.update({
        where: { id: draft.id },
        data: {
          ...applicationFieldData(data),
          status: "SUBMITTED",
          submittedAt: new Date(),
          ipAddress: args.ipAddress,
          userAgent: args.userAgent,
          draftPayload: Prisma.JsonNull,
          employmentHistory: {
            deleteMany: {},
            create: (data.employmentHistory ?? []).map((row, index) => ({
              employerName: row.employerName,
              positionTitle: row.positionTitle,
              startDate: new Date(row.startDate),
              endDate: row.endDate ? new Date(row.endDate) : null,
              responsibilities: row.responsibilities,
              reasonForLeaving: row.reasonForLeaving,
              permissionToContact: row.permissionToContact ?? false,
              sortOrder: index,
            })),
          },
          answers: {
            deleteMany: {},
            create: (data.answers ?? [])
              .filter((answer) => job.questions.some((question) => question.id === answer.questionId))
              .map((answer) => ({ questionId: answer.questionId, answer: answer.answer })),
          },
          acknowledgements: {
            create: [
              { legalDocumentId: ackDoc.id, ipAddress: args.ipAddress, userAgent: args.userAgent },
              { legalDocumentId: privacyDoc.id, ipAddress: args.ipAddress, userAgent: args.userAgent },
            ],
          },
          statusHistory: {
            create: {
              fromStatus: "DRAFT",
              toStatus: "SUBMITTED",
              changedBy: args.userId,
              note: "Application submitted",
            },
          },
        },
      })
    : await prisma.application.create({
        data: {
          trackingNumber: await uniqueTrackingNumber(),
          applicantId: applicant.id,
          jobOpeningId: job.id,
          status: "SUBMITTED",
          submittedAt: new Date(),
          ipAddress: args.ipAddress,
          userAgent: args.userAgent,
          ...applicationFieldData(data),
          draftPayload: Prisma.JsonNull,
          employmentHistory: {
            create: (data.employmentHistory ?? []).map((row, index) => ({
              employerName: row.employerName,
              positionTitle: row.positionTitle,
              startDate: new Date(row.startDate),
              endDate: row.endDate ? new Date(row.endDate) : null,
              responsibilities: row.responsibilities,
              reasonForLeaving: row.reasonForLeaving,
              permissionToContact: row.permissionToContact ?? false,
              sortOrder: index,
            })),
          },
          answers: {
            create: (data.answers ?? [])
              .filter((answer) => job.questions.some((question) => question.id === answer.questionId))
              .map((answer) => ({ questionId: answer.questionId, answer: answer.answer })),
          },
          acknowledgements: {
            create: [
              { legalDocumentId: ackDoc.id, ipAddress: args.ipAddress, userAgent: args.userAgent },
              { legalDocumentId: privacyDoc.id, ipAddress: args.ipAddress, userAgent: args.userAgent },
            ],
          },
          statusHistory: {
            create: { toStatus: "SUBMITTED", changedBy: args.userId, note: "Application submitted" },
          },
        },
      });

  if (!draft) {
    await assignDefaultApplicantRequirements({
      applicantId: applicant.id,
      applicationId: application.id,
      jobOpeningId: job.id,
    });
  }

  await writeAuditLog({
    actorId: args.userId,
    action: "application.submitted",
    targetType: "application",
    targetId: application.id,
    metadata: { trackingNumber: application.trackingNumber, jobPublicId: job.publicId },
  });

  return {
    ok: true as const,
    application: {
      id: application.id,
      trackingNumber: application.trackingNumber,
      status: application.status,
      statusLabel: applicantSafeStatusLabel(application.status),
      submittedAt: application.submittedAt,
    },
  };
}

/**
 * Legacy unauthenticated one-shot apply.
 * Status, drafts, and documents are not available on this path.
 * If the email already has an account, callers must sign in instead.
 */
export async function submitLegacyPublicApplication(args: {
  payload: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  if (!args.payload || typeof args.payload !== "object") {
    return { error: "Invalid application.", status: 400 as const };
  }
  try {
    assertNoForbiddenApplicationKeys(args.payload as Record<string, unknown>);
  } catch {
    return { error: "Invalid application.", status: 400 as const };
  }
  const parsed = applicationInputSchema.safeParse(args.payload);
  if (!parsed.success) return { error: "Please check the required fields and try again.", status: 400 as const };

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const job = await prisma.jobOpening.findFirst({
    where: { publicId: data.jobPublicId, status: "PUBLISHED" },
    include: { questions: true },
  });
  if (!job) return { error: "That position is not available.", status: 404 as const };

  const [ackDoc, privacyDoc] = await Promise.all([
    prisma.legalDocument.findFirst({ where: { slug: "application-acknowledgement", isCurrent: true } }),
    prisma.legalDocument.findFirst({ where: { slug: "applicant-privacy", isCurrent: true } }),
  ]);
  if (!ackDoc || !privacyDoc) {
    return { error: "Application notices are not configured.", status: 503 as const };
  }

  const existingApplicant = await prisma.applicant.findUnique({
    where: { email },
    include: { applications: { where: { jobOpeningId: job.id }, orderBy: { createdAt: "desc" } } },
  });
  const decision = decideApplicationWrite({
    mode: "public",
    applicantUserId: existingApplicant?.userId,
    existingForJob: existingApplicant?.applications[0] ?? null,
  });
  if (decision.action === "refuse_login_required") {
    return { error: decision.message, status: 409 as const, loginRequired: true as const };
  }
  if (decision.action === "reuse" && existingApplicant?.applications[0]) {
    const existing = existingApplicant.applications[0];
    return {
      ok: true as const,
      reused: true as const,
      application: {
        id: existing.id,
        trackingNumber: existing.trackingNumber,
        status: existing.status,
        statusLabel: applicantSafeStatusLabel(existing.status),
        submittedAt: existing.submittedAt,
      },
      applicantEmail: email,
      applicantName: existingApplicant.preferredName || existingApplicant.legalFirstName,
      jobTitle: job.title,
    };
  }

  const applicant = existingApplicant
    ? await prisma.applicant.update({
        where: { id: existingApplicant.id },
        data: {
          legalFirstName: data.legalFirstName,
          middleName: data.middleName,
          legalLastName: data.legalLastName,
          preferredName: data.preferredName,
          phone: data.phone,
          city: data.city,
          state: data.state,
          zip: data.zip,
        },
      })
    : await prisma.applicant.create({
        data: {
          legalFirstName: data.legalFirstName,
          middleName: data.middleName,
          legalLastName: data.legalLastName,
          preferredName: data.preferredName,
          email,
          phone: data.phone,
          city: data.city,
          state: data.state,
          zip: data.zip,
        },
      });

  const draft = decision.action === "submit_draft" ? existingApplicant?.applications[0] : null;
  const application = draft
    ? await prisma.application.update({
        where: { id: draft.id },
        data: {
          ...applicationFieldData(data),
          status: "SUBMITTED",
          submittedAt: new Date(),
          ipAddress: args.ipAddress,
          userAgent: args.userAgent,
          draftPayload: Prisma.JsonNull,
          employmentHistory: {
            deleteMany: {},
            create: (data.employmentHistory ?? []).map((row, index) => ({
              employerName: row.employerName,
              positionTitle: row.positionTitle,
              startDate: new Date(row.startDate),
              endDate: row.endDate ? new Date(row.endDate) : null,
              responsibilities: row.responsibilities,
              reasonForLeaving: row.reasonForLeaving,
              permissionToContact: row.permissionToContact ?? false,
              sortOrder: index,
            })),
          },
          answers: {
            deleteMany: {},
            create: (data.answers ?? [])
              .filter((answer) => job.questions.some((question) => question.id === answer.questionId))
              .map((answer) => ({ questionId: answer.questionId, answer: answer.answer })),
          },
          acknowledgements: {
            create: [
              { legalDocumentId: ackDoc.id, ipAddress: args.ipAddress, userAgent: args.userAgent },
              { legalDocumentId: privacyDoc.id, ipAddress: args.ipAddress, userAgent: args.userAgent },
            ],
          },
          statusHistory: {
            create: { fromStatus: "DRAFT", toStatus: "SUBMITTED", note: "Application submitted" },
          },
        },
      })
    : await prisma.application.create({
        data: {
          trackingNumber: await uniqueTrackingNumber(),
          applicantId: applicant.id,
          jobOpeningId: job.id,
          status: "SUBMITTED",
          submittedAt: new Date(),
          ipAddress: args.ipAddress,
          userAgent: args.userAgent,
          ...applicationFieldData(data),
          draftPayload: Prisma.JsonNull,
          employmentHistory: {
            create: (data.employmentHistory ?? []).map((row, index) => ({
              employerName: row.employerName,
              positionTitle: row.positionTitle,
              startDate: new Date(row.startDate),
              endDate: row.endDate ? new Date(row.endDate) : null,
              responsibilities: row.responsibilities,
              reasonForLeaving: row.reasonForLeaving,
              permissionToContact: row.permissionToContact ?? false,
              sortOrder: index,
            })),
          },
          answers: {
            create: (data.answers ?? [])
              .filter((answer) => job.questions.some((question) => question.id === answer.questionId))
              .map((answer) => ({ questionId: answer.questionId, answer: answer.answer })),
          },
          acknowledgements: {
            create: [
              { legalDocumentId: ackDoc.id, ipAddress: args.ipAddress, userAgent: args.userAgent },
              { legalDocumentId: privacyDoc.id, ipAddress: args.ipAddress, userAgent: args.userAgent },
            ],
          },
          statusHistory: {
            create: { toStatus: "SUBMITTED", note: "Application submitted" },
          },
        },
      });

  if (!draft) {
    await assignDefaultApplicantRequirements({
      applicantId: applicant.id,
      applicationId: application.id,
      jobOpeningId: job.id,
    });
  }

  await writeAuditLog({
    action: "application.submitted",
    targetType: "application",
    targetId: application.id,
    ipAddress: args.ipAddress,
    userAgent: args.userAgent,
    metadata: { trackingNumber: application.trackingNumber, jobPublicId: job.publicId, legacyPublic: true },
  });

  return {
    ok: true as const,
    reused: false as const,
    application: {
      id: application.id,
      trackingNumber: application.trackingNumber,
      status: application.status,
      statusLabel: applicantSafeStatusLabel(application.status),
      submittedAt: application.submittedAt,
    },
    applicantEmail: email,
    applicantName: data.preferredName || data.legalFirstName,
    jobTitle: job.title,
  };
}
