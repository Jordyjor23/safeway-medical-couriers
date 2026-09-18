import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { writeAuditLog } from "@/lib/audit";
import {
  applicationInputSchema,
  assertNoForbiddenApplicationKeys,
  publicApplicationView,
} from "@/lib/application-schema";
import { sendTransactionalEmail } from "@/lib/email";
import { createTrackingNumber } from "@/lib/ids";
import { prisma } from "@/lib/db";
import { publicStatusLabel } from "@/lib/careers-content";
import { site } from "@/lib/site";
import { DocumentStorageError, storePrivateFile } from "@/lib/storage";
import { validateDocumentFile } from "@/lib/documents/validate";

export const dynamic = "force-dynamic";

async function clientIp() {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  const ip = await clientIp();
  const userAgent = (await headers()).get("user-agent");

  const recent = await prisma.application.count({
    where: {
      ipAddress: ip,
      createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
    },
  });
  if (recent >= 5) {
    return NextResponse.json({ error: "Too many applications from this network. Try again later." }, { status: 429 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "A resume upload is required with the application." }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid application." }, { status: 400 });
  }

  const applicationJson = formData.get("application");
  const resume = formData.get("resume");
  if (typeof applicationJson !== "string") {
    return NextResponse.json({ error: "Invalid application." }, { status: 400 });
  }
  if (!(resume instanceof File) || resume.size === 0) {
    return NextResponse.json({ error: "Please upload your resume." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(applicationJson);
  } catch {
    return NextResponse.json({ error: "Invalid application." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid application." }, { status: 400 });
  }

  try {
    assertNoForbiddenApplicationKeys(body as Record<string, unknown>);
  } catch {
    return NextResponse.json({ error: "Invalid application." }, { status: 400 });
  }

  const parsed = applicationInputSchema.safeParse(body);
  if (!parsed.success) {
    const fields = Array.from(
      new Set(
        parsed.error.issues
          .map((issue) => issue.path[0])
          .filter((field): field is string | number => field !== undefined)
          .map(String),
      ),
    );
    return NextResponse.json(
      {
        error: "Please complete the missing or invalid application fields.",
        fields,
      },
      { status: 400 },
    );
  }

  const resumeValidation = await validateDocumentFile(resume);
  if (!resumeValidation.ok) {
    return NextResponse.json({ error: resumeValidation.error }, { status: 400 });
  }
  if (!["pdf", "docx"].includes(resumeValidation.kind)) {
    return NextResponse.json({ error: "Resume must be a PDF or DOCX file." }, { status: 400 });
  }

  const data = parsed.data;
  const job = await prisma.jobOpening.findFirst({
    where: { publicId: data.jobPublicId, status: "PUBLISHED" },
    include: { questions: true },
  });
  if (!job) {
    return NextResponse.json({ error: "That position is not available." }, { status: 404 });
  }

  const [ackDoc, privacyDoc] = await Promise.all([
    prisma.legalDocument.findFirst({ where: { slug: "application-acknowledgement", isCurrent: true } }),
    prisma.legalDocument.findFirst({ where: { slug: "applicant-privacy", isCurrent: true } }),
  ]);
  if (!ackDoc || !privacyDoc) {
    return NextResponse.json(
      { error: "We could not submit your application because the hiring notices are temporarily unavailable. Your saved application has not been lost. Please try again shortly." },
      { status: 503 },
    );
  }

  const applicant = await prisma.applicant.upsert({
    where: { email: data.email.toLowerCase() },
    update: {
      legalFirstName: data.legalFirstName,
      middleName: data.middleName,
      legalLastName: data.legalLastName,
      preferredName: data.preferredName,
      phone: data.phone,
      city: data.city,
      state: data.state,
      zip: data.zip,
    },
    create: {
      legalFirstName: data.legalFirstName,
      middleName: data.middleName,
      legalLastName: data.legalLastName,
      preferredName: data.preferredName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      city: data.city,
      state: data.state,
      zip: data.zip,
    },
  });

  let trackingNumber = createTrackingNumber();
  for (let i = 0; i < 5; i += 1) {
    const exists = await prisma.application.findUnique({ where: { trackingNumber } });
    if (!exists) break;
    trackingNumber = createTrackingNumber();
  }

  let storedResume;
  try {
    storedResume = await storePrivateFile(resume);
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      return NextResponse.json(
        {
          error:
            "Resume storage is temporarily unavailable. Your application draft is still saved in this browser. Please try again shortly.",
          code: "DOCUMENT_STORAGE_UNAVAILABLE",
        },
        { status: 503 },
      );
    }
    throw error;
  }

  const application = await prisma.application.create({
    data: {
      trackingNumber,
      applicantId: applicant.id,
      jobOpeningId: job.id,
      status: "SUBMITTED",
      preferredEmploymentType: data.preferredEmploymentType,
      availableStartDate: data.availableStartDate ? new Date(data.availableStartDate) : null,
      generalAvailability: data.generalAvailability,
      preferredShift: data.preferredShift,
      fullTimePreference: data.fullTimePreference,
      serviceAreas: data.serviceAreas,
      weekdays: data.weekdays ?? false,
      weekends: data.weekends ?? false,
      holidays: data.holidays ?? false,
      earlyMornings: data.earlyMornings ?? false,
      evenings: data.evenings ?? false,
      overnight: data.overnight ?? false,
      onCallStat: data.onCallStat ?? false,
      authorizedToWorkUs: data.authorizedToWorkUs,
      requiresSponsorship: data.requiresSponsorship,
      highestEducation: data.highestEducation,
      relevantTraining: data.relevantTraining,
      licenses: data.licenses,
      certifications: data.certifications,
      courierExperience: data.courierExperience,
      healthcareLogisticsExperience: data.healthcareLogisticsExperience,
      customerServiceExperience: data.customerServiceExperience,
      dispatchExperience: data.dispatchExperience,
      technologyExperience: data.technologyExperience,
      canPerformEssentialFunctions: data.canPerformEssentialFunctions,
      hipaaTraining: data.hipaaTraining ?? false,
      bloodbornePathogensTraining: data.bloodbornePathogensTraining ?? false,
      hazmatAwarenessTraining: data.hazmatAwarenessTraining ?? false,
      un3373Training: data.un3373Training ?? false,
      chainOfCustodyTraining: data.chainOfCustodyTraining ?? false,
      temperatureControlledExperience: data.temperatureControlledExperience ?? false,
      pharmaceuticalDeliveryExperience: data.pharmaceuticalDeliveryExperience ?? false,
      laboratoryCourierExperience: data.laboratoryCourierExperience ?? false,
      hasValidDriversLicense: job.requiresDriversLicense ? data.hasValidDriversLicense : null,
      licenseIssuingState: data.licenseIssuingState,
      licenseClass: data.licenseClass,
      canMeetDrivingRequirements: data.canMeetDrivingRequirements,
      hasPersonalVehicle: data.hasPersonalVehicle,
      vehicleType: data.vehicleType,
      proofOfInsurance: data.proofOfInsurance,
      canUseGpsApps: data.canUseGpsApps,
      relevantCourierDrivingExperience: data.relevantCourierDrivingExperience,
      resumeFileKey: storedResume.blobKey,
      submittedAt: new Date(),
      ipAddress: ip,
      userAgent,
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
          .map((answer) => ({
            questionId: answer.questionId,
            answer: answer.answer,
          })),
      },
      acknowledgements: {
        create: [
          { legalDocumentId: ackDoc.id, ipAddress: ip, userAgent },
          { legalDocumentId: privacyDoc.id, ipAddress: ip, userAgent },
        ],
      },
      statusHistory: {
        create: { toStatus: "SUBMITTED", note: "Application submitted" },
      },
      documents: {
        create: {
          document: {
            create: {
              name: "Resume",
              category: "APPLICANT_DOCUMENTS",
              documentType: "RESUME",
              blobKey: storedResume.blobKey,
              mimeType: storedResume.mimeType,
              sizeBytes: storedResume.sizeBytes,
              originalFileName: storedResume.originalFileName,
              storedFileName: storedResume.storedFileName,
              contentSha256: storedResume.contentSha256,
              isSensitive: true,
              lifecycleStatus: "UPLOADED",
              verificationStatus: "UNVERIFIED",
              extractionStatus: "OCR_DISABLED",
              notes: "Resume submitted with public job application.",
            },
          },
        },
      },
    },
    include: {
      applicant: true,
      jobOpening: true,
    },
  });

  await writeAuditLog({
    action: "application.submitted",
    targetType: "application",
    targetId: application.id,
    ipAddress: ip,
    userAgent,
    metadata: { trackingNumber, jobPublicId: job.publicId, resumeAttached: true },
  });

  const recruitingRecipients = await prisma.user.findMany({
    where: {
      disabled: false,
      accountStatus: "ACTIVE",
      roles: {
        some: {
          role: {
            key: { in: ["OWNER", "ADMIN", "HR_RECRUITER"] },
          },
        },
      },
    },
    select: { id: true, email: true, name: true },
  });

  if (recruitingRecipients.length) {
    await prisma.notification.createMany({
      data: recruitingRecipients.map((recipient) => ({
        userId: recipient.id,
        type: "APPLICATION_RECEIVED",
        title: `New application: ${applicant.legalFirstName} ${applicant.legalLastName}`,
        body: `${job.title} · ${job.location} · ${trackingNumber}`,
        href: `/dashboard/applicants/${application.id}`,
        dedupeKey: `application-received:${application.id}:${recipient.id}`,
      })),
      skipDuplicates: true,
    });

    await Promise.allSettled(
      recruitingRecipients.map((recipient) =>
        sendTransactionalEmail({
          to: recipient.email,
          subject: `New Safeway application — ${applicant.legalFirstName} ${applicant.legalLastName}`,
          html: `<p>Hello ${recipient.name || "Safeway team"},</p>
<p>A new application was submitted for <strong>${job.title}</strong>.</p>
<p><strong>Applicant:</strong> ${applicant.legalFirstName} ${applicant.legalLastName}<br />
<strong>Location:</strong> ${job.location}<br />
<strong>Reference:</strong> ${trackingNumber}</p>
<p><a href="${site.url}/dashboard/applicants/${application.id}">Open the application</a></p>`,
        }),
      ),
    );
  }

  try {
    await sendTransactionalEmail({
      to: applicant.email,
      subject: `Application received — ${job.title}`,
      html: `<p>Hello ${applicant.preferredName || applicant.legalFirstName},</p>
<p>Safeway Couriers received your application for ${job.title}.</p>
<p>Reference number: <strong>${trackingNumber}</strong></p>
<p>You can check status at ${site.url}/careers/status</p>`,
    });
  } catch {
    // Email is best-effort; the application is already stored.
  }

  return NextResponse.json({
    application: {
      ...publicApplicationView(application),
      statusLabel: publicStatusLabel(application.status),
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackingNumber = searchParams.get("tracking")?.trim();
  const email = searchParams.get("email")?.trim().toLowerCase();
  if (!trackingNumber || !email) {
    return NextResponse.json({ error: "Tracking number and email are required." }, { status: 400 });
  }

  const application = await prisma.application.findFirst({
    where: {
      trackingNumber,
      applicant: { email },
      status: { not: "DRAFT" },
    },
    include: { applicant: true, jobOpening: true },
  });

  if (!application) {
    return NextResponse.json({ error: "No application matched that reference and email." }, { status: 404 });
  }

  return NextResponse.json({
    application: {
      ...publicApplicationView(application),
      statusLabel: publicStatusLabel(application.status),
    },
  });
}
