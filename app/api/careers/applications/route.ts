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

  const body = await request.json().catch(() => null);
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
    return NextResponse.json({ error: "Please check the required fields and try again." }, { status: 400 });
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
    return NextResponse.json({ error: "Application notices are not configured." }, { status: 503 });
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
    metadata: { trackingNumber, jobPublicId: job.publicId },
  });

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
