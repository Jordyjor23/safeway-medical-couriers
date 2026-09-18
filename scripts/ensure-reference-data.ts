import { PrismaClient } from "@prisma/client";

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
    handlingInstructions: "Configure all timing, packaging, temperature, custody, communication, and receiving requirements to the governing client/OPO protocol before use.",
  },
];

async function main() {
  for (const category of careerCategories) {
    await prisma.careerCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
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
