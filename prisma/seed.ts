import { PrismaClient } from "@prisma/client";
import {
  PERMISSIONS,
  ROLE_KEYS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from "../lib/permissions";
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

const complianceRequirements = [
  { key: "hipaa", name: "HIPAA training", sortOrder: 10 },
  { key: "bloodborne_pathogens", name: "Bloodborne Pathogens", sortOrder: 20 },
  { key: "hazmat_awareness", name: "HazMat General Awareness", sortOrder: 30 },
  { key: "un3373", name: "UN3373", sortOrder: 40 },
  { key: "sop_acknowledgement", name: "Internal SOP acknowledgement", sortOrder: 50 },
  { key: "driver_qualification", name: "Driver qualification", sortOrder: 60 },
  { key: "insurance", name: "Insurance", sortOrder: 70 },
  { key: "vehicle_registration", name: "Vehicle registration", sortOrder: 80 },
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
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        description: key.replaceAll(".", " "),
      },
    });
  }

  for (const key of ROLE_KEYS) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { name: ROLE_LABELS[key] },
      create: {
        key,
        name: ROLE_LABELS[key],
        description: ROLE_LABELS[key],
        system: true,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const permissionKeys = ROLE_PERMISSIONS[key];
    if (permissionKeys.length === 0) continue;
    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...permissionKeys] } },
    });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
    });
  }

  for (const category of careerCategories) {
    await prisma.careerCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  for (const requirement of complianceRequirements) {
    await prisma.complianceRequirement.upsert({
      where: { key: requirement.key },
      update: requirement,
      create: requirement,
    });
  }

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
        accommodationEmail: "[Business Email]",
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
