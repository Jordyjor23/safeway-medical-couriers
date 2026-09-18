import { PrismaClient } from "@prisma/client";
import {
  EVERGREEN_INDEPENDENT_COURIER_PUBLIC_ID,
  EVERGREEN_MEDICAL_COURIER_PUBLIC_ID,
} from "../lib/evergreen-jobs";
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
  { slug: "medical-courier", name: "Medical Courier", opportunityType: "EMPLOYMENT" as const, compensationDisplay: "$21–$24/hour depending on experience, qualifications and assignment", summary: "Scheduled and on-demand medical deliveries for healthcare organizations.", sortOrder: 10, requiresDriving: true, isMedicalCourier: true },
  { slug: "specialty-medical-courier", name: "Specialty Medical Courier", opportunityType: "EMPLOYMENT" as const, compensationDisplay: "$24–$28/hour depending on qualifications and assignment", summary: "Specialized handling for specimens, pharmaceuticals, and time-critical healthcare materials.", sortOrder: 20, requiresDriving: true, isMedicalCourier: true },
  { slug: "dispatcher", name: "Dispatcher / Logistics Coordinator", opportunityType: "EMPLOYMENT" as const, compensationDisplay: "$23–$27/hour", summary: "Coordinate routes, couriers, and time-sensitive dispatch work.", sortOrder: 30, requiresDriving: false, isMedicalCourier: false },
  { slug: "customer-support", name: "Customer Support Specialist", opportunityType: "EMPLOYMENT" as const, compensationDisplay: "$20–$25/hour", summary: "Support healthcare clients with service requests and communication.", sortOrder: 40, requiresDriving: false, isMedicalCourier: false },
  { slug: "operations-coordinator", name: "Operations Coordinator", opportunityType: "EMPLOYMENT" as const, compensationDisplay: "$25–$32/hour", summary: "Support daily operations, routing, and operational documentation.", sortOrder: 50, requiresDriving: false, isMedicalCourier: false },
  { slug: "compliance-quality", name: "Compliance / Quality Coordinator", opportunityType: "EMPLOYMENT" as const, compensationDisplay: "$27–$34/hour", summary: "Track training, documentation, and quality processes.", sortOrder: 60, requiresDriving: false, isMedicalCourier: false },
  { slug: "sales-business-development", name: "Sales / Business Development", opportunityType: "EMPLOYMENT" as const, compensationDisplay: "Base salary plus commission", summary: "Develop healthcare-client relationships and service opportunities.", sortOrder: 70, requiresDriving: false, isMedicalCourier: false },
  { slug: "technology", name: "Technology Opportunities", opportunityType: "EMPLOYMENT" as const, compensationDisplay: "Based on position and experience", summary: "Technology roles supporting dispatch, delivery management, and operations.", sortOrder: 80, requiresDriving: false, isMedicalCourier: false },
  { slug: "independent-courier-partner", name: "Independent Courier Partner", opportunityType: "INDEPENDENT_CONTRACTOR" as const, compensationDisplay: "Compensation varies by route, mileage, assignment type, urgency, specialty handling requirements and other applicable factors.", summary: "Independent contractor opportunities. This is not an hourly employment position.", sortOrder: 90, requiresDriving: true, isMedicalCourier: true },
];

const evergreenJobs = [
  {
    publicId: EVERGREEN_MEDICAL_COURIER_PUBLIC_ID,
    categorySlug: "medical-courier",
    title: "Medical Courier",
    department: "Medical Courier Operations",
    employmentType: "FULL_TIME" as const,
    workerClassification: "EMPLOYEE" as const,
    location: "Columbus / Central Ohio",
    workArrangement: "ONSITE" as const,
    compensationMin: 21,
    compensationMax: 24,
    payType: "HOURLY" as const,
    compensationNotes: "$21–$24/hour depending on experience, qualifications and assignment",
    description:
      "Safeway Couriers accepts ongoing applications for W-2 medical courier opportunities supporting healthcare and time-sensitive deliveries in Central Ohio. Submitting an application does not guarantee an immediate opening, schedule, route, or offer of employment.",
    essentialDuties:
      "Safely pick up and deliver medical specimens, supplies, pharmaceuticals, records, and other authorized materials; follow assignment instructions; maintain required chain-of-custody and proof-of-delivery records; protect confidential information; communicate delays or incidents promptly; and follow Safeway Couriers safety, customer-site, and handling procedures.",
    minimumQualifications:
      "Valid driver's license when driving is required; ability to meet Safeway Couriers driving and background requirements for the assigned role; reliable communication and GPS capability; professional customer service; ability to follow time-sensitive written procedures; and ability to complete required onboarding and training before assignment.",
    preferredQualifications:
      "Medical courier, healthcare logistics, specimen transport, pharmacy delivery, route delivery, HIPAA, Bloodborne Pathogens, HazMat/HMR, UN3373, chain-of-custody, or temperature-controlled shipment experience.",
    physicalRequirements:
      "Job-specific physical and lifting requirements vary by assignment and will be disclosed for the applicable position or route.",
    schedule:
      "Evergreen applicant pool. Available schedules and route coverage needs vary and are discussed for specific W-2 openings.",
    requiredCertifications:
      "Training and credential requirements vary by assignment. Safeway verifies required credentials before route eligibility.",
    requiresDriversLicense: true,
    vehicleRequirements:
      "Vehicle requirements vary by position and route. A personally supplied vehicle may be required for some opportunities and will be disclosed before assignment.",
    backgroundCheckRequired: true,
    mvrRequired: true,
  },
  {
    publicId: EVERGREEN_INDEPENDENT_COURIER_PUBLIC_ID,
    categorySlug: "independent-courier-partner",
    title: "Independent Courier Partner",
    department: "Medical Courier Operations",
    employmentType: "PART_TIME" as const,
    workerClassification: "INDEPENDENT_CONTRACTOR" as const,
    location: "Columbus / Central Ohio",
    workArrangement: "ONSITE" as const,
    compensationMin: null,
    compensationMax: null,
    payType: "ROUTE_BASED" as const,
    compensationNotes:
      "Compensation varies by route, mileage, assignment type, urgency, specialty handling requirements and other applicable factors.",
    description:
      "Safeway Couriers accepts ongoing applications from independent courier partners for route-based and on-demand opportunities. This is an independent contractor opportunity, not an hourly employment position. Applying does not guarantee assignments, minimum volume, or a contractor agreement.",
    essentialDuties:
      "For accepted assignments, safely pick up and deliver authorized medical and time-sensitive materials; follow the written route and customer requirements; maintain required chain-of-custody and proof-of-delivery records; protect confidential information; and communicate assignment exceptions or incidents promptly.",
    minimumQualifications:
      "Ability to satisfy the requirements of the applicable independent contractor agreement; valid driver's license; acceptable driving qualifications; reliable smartphone/GPS access; ability to meet vehicle and insurance requirements for accepted assignments; and completion of required onboarding and training before eligible assignments.",
    preferredQualifications:
      "Medical courier, healthcare logistics, specimen transport, pharmacy delivery, route delivery, HIPAA, Bloodborne Pathogens, HazMat/HMR, UN3373, chain-of-custody, or temperature-controlled shipment experience.",
    physicalRequirements:
      "Assignment-specific physical and handling requirements are disclosed before the applicable route or engagement.",
    schedule:
      "Evergreen contractor pool. Assignment availability varies by customer demand, route requirements, geography, timing, and verified qualifications.",
    requiredCertifications:
      "Training and credential requirements vary by assignment. Safeway verifies required credentials before route eligibility.",
    requiresDriversLicense: true,
    vehicleRequirements:
      "Contractors must meet the vehicle and insurance requirements stated for the applicable route or contractor engagement.",
    backgroundCheckRequired: true,
    mvrRequired: true,
  },
];

const routeTemplates = [
  {
    templateCode: "GEN-MEDICAL-STANDARD",
    scope: "GENERIC" as const,
    name: "Standard Medical Courier Route",
    pickupBusinessName: "Pickup Facility",
    deliveryBusinessName: "Receiving Facility",
    operatingDays: "Mon-Fri",
    shipmentType: "Medical specimens / supplies",
    chainOfCustodyRequired: false,
    proofOfDeliveryRequired: true,
    requiredTrainingKeys: "HIPAA,BLOODBORNE_PATHOGENS",
    requiredDocumentTypes: "ROUTE_SPECIFICATION,PICKUP_INSTRUCTIONS,FACILITY_REQUIREMENTS",
    handlingInstructions: "Follow customer SOPs and assignment-specific handling instructions.",
  },
  {
    templateCode: "GEN-STAT-ONCALL",
    scope: "GENERIC" as const,
    name: "STAT / On-Call Medical Route",
    pickupBusinessName: "Pickup Facility",
    deliveryBusinessName: "Receiving Facility",
    operatingDays: "On demand",
    shipmentType: "STAT medical delivery",
    chainOfCustodyRequired: true,
    proofOfDeliveryRequired: true,
    requiredTrainingKeys: "HIPAA,BLOODBORNE_PATHOGENS,CHAIN_OF_CUSTODY",
    requiredDocumentTypes: "ROUTE_SPECIFICATION,PICKUP_INSTRUCTIONS,CHAIN_OF_CUSTODY",
    handlingInstructions: "Time-critical assignment. Confirm pickup, chain of custody, and delivery handoff.",
  },
  {
    templateCode: "GEN-TEMP-CONTROLLED",
    scope: "GENERIC" as const,
    name: "Temperature-Controlled Medical Route",
    pickupBusinessName: "Pickup Facility",
    deliveryBusinessName: "Receiving Facility",
    operatingDays: "Configure per contract",
    shipmentType: "Temperature-controlled medical materials",
    temperatureRequired: "Configure per customer / shipment",
    chainOfCustodyRequired: true,
    proofOfDeliveryRequired: true,
    requiredTrainingKeys: "HIPAA,BLOODBORNE_PATHOGENS,CHAIN_OF_CUSTODY",
    requiredDocumentTypes: "ROUTE_SPECIFICATION,PICKUP_INSTRUCTIONS,TEMPERATURE_LOG",
    handlingInstructions: "Verify required temperature range before dispatch and document exceptions.",
  },
  {
    templateCode: "GEN-CHAIN-CUSTODY",
    scope: "GENERIC" as const,
    name: "Chain-of-Custody Route",
    pickupBusinessName: "Pickup Facility",
    deliveryBusinessName: "Receiving Facility",
    operatingDays: "Configure per contract",
    shipmentType: "Controlled chain-of-custody delivery",
    chainOfCustodyRequired: true,
    proofOfDeliveryRequired: true,
    requiredTrainingKeys: "HIPAA,CHAIN_OF_CUSTODY",
    requiredDocumentTypes: "ROUTE_SPECIFICATION,CHAIN_OF_CUSTODY",
    handlingInstructions: "Document every required custody transfer and receiving-party sign-off.",
  },
  {
    templateCode: "GEN-SPECIALTY-ORGAN",
    scope: "GENERIC" as const,
    name: "Specialty / Organ & Tissue Transport",
    pickupBusinessName: "Origin / Recovery Facility",
    deliveryBusinessName: "Transplant / Receiving Facility",
    operatingDays: "On demand",
    shipmentType: "Specialty organ / tissue transport",
    chainOfCustodyRequired: true,
    proofOfDeliveryRequired: true,
    requiredTrainingKeys: "HIPAA,BLOODBORNE_PATHOGENS,CHAIN_OF_CUSTODY",
    requiredDocumentTypes: "ROUTE_SPECIFICATION,PICKUP_INSTRUCTIONS,FACILITY_REQUIREMENTS,CHAIN_OF_CUSTODY,CUSTOMER_PROVIDED_PAPERWORK",
    handlingInstructions: "Configure all timing, packaging, temperature, custody, communication, and receiving requirements to the governing client/OPO protocol before use.",
  },
];

async function ensureLegal(slug: string, title: string, body: string) {
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
  await ensureLegal("eeo", "Equal Employment Opportunity", DEFAULT_EEO_STATEMENT);
  await ensureLegal("applicant-privacy", "Applicant Privacy Notice", DEFAULT_APPLICANT_PRIVACY);
  await ensureLegal(
    "application-acknowledgement",
    "Application Acknowledgement",
    DEFAULT_APPLICATION_ACKNOWLEDGEMENT,
  );
  await ensureLegal("accommodation", "Accessibility / Accommodation", DEFAULT_ACCOMMODATION_NOTICE);
  await ensureLegal("fcra-disclosure", "Background Check Disclosure", DEFAULT_FCRA_DISCLOSURE);

  for (const category of careerCategories) {
    await prisma.careerCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  for (const evergreen of evergreenJobs) {
    const category = await prisma.careerCategory.findUnique({
      where: { slug: evergreen.categorySlug },
      select: { id: true },
    });
    if (!category) throw new Error(`Missing career category: ${evergreen.categorySlug}`);

    const data = {
      title: evergreen.title,
      department: evergreen.department,
      categoryId: category.id,
      employmentType: evergreen.employmentType,
      workerClassification: evergreen.workerClassification,
      location: evergreen.location,
      workArrangement: evergreen.workArrangement,
      compensationMin: evergreen.compensationMin,
      compensationMax: evergreen.compensationMax,
      payType: evergreen.payType,
      compensationNotes: evergreen.compensationNotes,
      description: evergreen.description,
      essentialDuties: evergreen.essentialDuties,
      minimumQualifications: evergreen.minimumQualifications,
      preferredQualifications: evergreen.preferredQualifications,
      physicalRequirements: evergreen.physicalRequirements,
      schedule: evergreen.schedule,
      requiredCertifications: evergreen.requiredCertifications,
      requiresDriversLicense: evergreen.requiresDriversLicense,
      vehicleRequirements: evergreen.vehicleRequirements,
      backgroundCheckRequired: evergreen.backgroundCheckRequired,
      mvrRequired: evergreen.mvrRequired,
      status: "PUBLISHED" as const,
      closesAt: null,
    };

    await prisma.jobOpening.upsert({
      where: { publicId: evergreen.publicId },
      update: data,
      create: {
        publicId: evergreen.publicId,
        ...data,
        postedAt: new Date(),
      },
    });
  }

  for (const template of routeTemplates) {
    await prisma.routeTemplate.upsert({
      where: { templateCode: template.templateCode },
      update: {},
      create: template,
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
