import { PrismaClient } from "@prisma/client";
import { seedPhase1Requirements } from "../lib/compliance/requirements";
import { seedComplianceRegister } from "../lib/compliance/register";
import { ensureMedicalCourierDriverDraft } from "../lib/jobs/ensure-draft";
import { ensureSystemRoles } from "../lib/ensure-rbac";
import {
  DEFAULT_ACCOMMODATION_NOTICE,
  DEFAULT_APPLICANT_PRIVACY,
  DEFAULT_APPLICATION_ACKNOWLEDGEMENT,
  DEFAULT_EEO_STATEMENT,
  DEFAULT_FCRA_DISCLOSURE,
  LEGAL_REVIEW_NOTE,
} from "../lib/legal-copy";

const prisma = new PrismaClient();

const careerCategories = [
  {
    slug: "medical-courier",
    name: "Medical Courier",
    opportunityType: "EMPLOYMENT" as const,
    compensationDisplay:
      "$21–$24/hour depending on experience, qualifications and assignment",
    summary:
      "Scheduled and on-demand medical deliveries for healthcare organizations.",
    sortOrder: 10,
    requiresDriving: true,
    isMedicalCourier: true,
  },
  {
    slug: "specialty-medical-courier",
    name: "Specialty Medical Courier",
    opportunityType: "EMPLOYMENT" as const,
    compensationDisplay:
      "$24–$28/hour depending on qualifications and assignment",
    summary:
      "Specialized handling for specimens, pharmaceuticals, and time-critical healthcare materials.",
    sortOrder: 20,
    requiresDriving: true,
    isMedicalCourier: true,
  },
  {
    slug: "dispatcher",
    name: "Dispatcher / Logistics Coordinator",
    opportunityType: "EMPLOYMENT" as const,
    compensationDisplay: "$23–$27/hour",
    summary: "Coordinate routes, couriers, and time-sensitive dispatch work.",
    sortOrder: 30,
    requiresDriving: false,
    isMedicalCourier: false,
  },
  {
    slug: "customer-support",
    name: "Customer Support Specialist",
    opportunityType: "EMPLOYMENT" as const,
    compensationDisplay: "$20–$25/hour",
    summary: "Support healthcare clients with service requests and communication.",
    sortOrder: 40,
    requiresDriving: false,
    isMedicalCourier: false,
  },
  {
    slug: "operations-coordinator",
    name: "Operations Coordinator",
    opportunityType: "EMPLOYMENT" as const,
    compensationDisplay: "$25–$32/hour",
    summary: "Support daily operations, routing, and operational documentation.",
    sortOrder: 50,
    requiresDriving: false,
    isMedicalCourier: false,
  },
  {
    slug: "compliance-quality",
    name: "Compliance / Quality Coordinator",
    opportunityType: "EMPLOYMENT" as const,
    compensationDisplay: "$27–$34/hour",
    summary: "Track training, documentation, and quality processes.",
    sortOrder: 60,
    requiresDriving: false,
    isMedicalCourier: false,
  },
  {
    slug: "sales-business-development",
    name: "Sales / Business Development",
    opportunityType: "EMPLOYMENT" as const,
    compensationDisplay: "Base salary plus commission",
    summary: "Develop healthcare-client relationships and service opportunities.",
    sortOrder: 70,
    requiresDriving: false,
    isMedicalCourier: false,
  },
  {
    slug: "technology",
    name: "Technology Opportunities",
    opportunityType: "EMPLOYMENT" as const,
    compensationDisplay: "Based on position and experience",
    summary: "Technology roles supporting dispatch, delivery management, and operations.",
    sortOrder: 80,
    requiresDriving: false,
    isMedicalCourier: false,
  },
  {
    slug: "independent-courier-partner",
    name: "Independent Courier Partner",
    opportunityType: "INDEPENDENT_CONTRACTOR" as const,
    compensationDisplay:
      "Compensation varies by route, mileage, assignment type, urgency, specialty handling requirements and other applicable factors.",
    summary:
      "Independent contractor opportunities. This is not an hourly employment position.",
    sortOrder: 90,
    requiresDriving: true,
    isMedicalCourier: true,
  },
];

async function seedLegal(slug: string, title: string, body: string) {
  await prisma.legalDocument.upsert({
    where: { slug_version: { slug, version: "1.0" } },
    update: { title, body, isCurrent: true, reviewNotes: LEGAL_REVIEW_NOTE },
    create: {
      slug,
      title,
      version: "1.0",
      body,
      isCurrent: true,
      reviewNotes: LEGAL_REVIEW_NOTE,
    },
  });
}

async function main() {
  await ensureSystemRoles(prisma);

  for (const category of careerCategories) {
    await prisma.careerCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  await seedPhase1Requirements();
  await ensureMedicalCourierDriverDraft();
  await seedComplianceRegister();

  await seedLegal("eeo", "Equal Employment Opportunity", DEFAULT_EEO_STATEMENT);
  await seedLegal("applicant-privacy", "Applicant Privacy Notice", DEFAULT_APPLICANT_PRIVACY);
  await seedLegal(
    "application-acknowledgement",
    "Application Acknowledgement",
    DEFAULT_APPLICATION_ACKNOWLEDGEMENT,
  );
  await seedLegal("accommodation", "Accessibility / Accommodation", DEFAULT_ACCOMMODATION_NOTICE);
  await seedLegal("fcra-disclosure", "Background Check Disclosure", DEFAULT_FCRA_DISCLOSURE);

  await prisma.systemSetting.upsert({
    where: { key: "careers" },
    update: {},
    create: {
      key: "careers",
      value: {
        heroHeadline: "Deliver More Than Packages. Deliver With Purpose.",
        heroBody:
          "Safeway Couriers provides secure, dependable and professional courier services specializing in healthcare, medical, time-sensitive and business deliveries.",
        primaryCta: "View Open Positions",
        secondaryCta: "Join Our Courier Network",
        accommodationEmail: "medworld@safewaycouriers.com",
        voluntaryEeoEnabled: false,
      },
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: "notifications" },
    update: {},
    create: {
      key: "notifications",
      value: { contractExpirationDays: [90, 60, 30, 14, 7] },
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: "retention" },
    update: {},
    create: {
      key: "retention",
      value: { applicationRetentionDays: 730 },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
