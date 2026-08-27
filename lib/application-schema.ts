import { z } from "zod";

const employmentSchema = z.object({
  employerName: z.string().min(1).max(200),
  positionTitle: z.string().min(1).max(200),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  responsibilities: z.string().max(4000).optional(),
  reasonForLeaving: z.string().max(500).optional(),
  permissionToContact: z.boolean().optional(),
});

export const applicationInputSchema = z.object({
  jobPublicId: z.string().min(1),
  legalFirstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  legalLastName: z.string().min(1).max(100),
  preferredName: z.string().max(100).optional(),
  email: z.string().email(),
  phone: z.string().min(7).max(40),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(40),
  zip: z.string().min(3).max(20),
  preferredEmploymentType: z.enum(["FULL_TIME", "PART_TIME", "TEMPORARY", "SEASONAL"]).optional(),
  availableStartDate: z.string().optional(),
  generalAvailability: z.string().max(2000).optional(),
  preferredShift: z.string().max(200).optional(),
  fullTimePreference: z.boolean().optional(),
  serviceAreas: z.string().max(1000).optional(),
  weekdays: z.boolean().optional(),
  weekends: z.boolean().optional(),
  holidays: z.boolean().optional(),
  earlyMornings: z.boolean().optional(),
  evenings: z.boolean().optional(),
  overnight: z.boolean().optional(),
  onCallStat: z.boolean().optional(),
  authorizedToWorkUs: z.boolean(),
  requiresSponsorship: z.boolean().optional(),
  highestEducation: z.string().max(200).optional(),
  relevantTraining: z.string().max(4000).optional(),
  licenses: z.string().max(2000).optional(),
  certifications: z.string().max(2000).optional(),
  courierExperience: z.string().max(4000).optional(),
  healthcareLogisticsExperience: z.string().max(4000).optional(),
  customerServiceExperience: z.string().max(4000).optional(),
  dispatchExperience: z.string().max(4000).optional(),
  technologyExperience: z.string().max(4000).optional(),
  canPerformEssentialFunctions: z.boolean(),
  hipaaTraining: z.boolean().optional(),
  bloodbornePathogensTraining: z.boolean().optional(),
  hazmatAwarenessTraining: z.boolean().optional(),
  un3373Training: z.boolean().optional(),
  chainOfCustodyTraining: z.boolean().optional(),
  temperatureControlledExperience: z.boolean().optional(),
  pharmaceuticalDeliveryExperience: z.boolean().optional(),
  laboratoryCourierExperience: z.boolean().optional(),
  hasValidDriversLicense: z.boolean().optional(),
  licenseIssuingState: z.string().max(40).optional(),
  licenseClass: z.string().max(40).optional(),
  canMeetDrivingRequirements: z.boolean().optional(),
  hasPersonalVehicle: z.boolean().optional(),
  vehicleType: z.string().max(100).optional(),
  proofOfInsurance: z.boolean().optional(),
  canUseGpsApps: z.boolean().optional(),
  relevantCourierDrivingExperience: z.string().max(4000).optional(),
  employmentHistory: z.array(employmentSchema).max(12).optional(),
  answers: z.array(z.object({ questionId: z.string(), answer: z.string().max(4000) })).optional(),
  acknowledgementAccepted: z.literal(true),
  privacyReviewed: z.literal(true),
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

const forbiddenKeys = [
  "ssn",
  "socialSecurity",
  "dateOfBirth",
  "dob",
  "salary",
  "wage",
  "compensationHistory",
  "photograph",
  "religion",
  "maritalStatus",
  "pregnancy",
  "disability",
  "children",
  "childcare",
];

export function assertNoForbiddenApplicationKeys(payload: Record<string, unknown>) {
  const keys = Object.keys(payload).map((key) => key.toLowerCase());
  for (const forbidden of forbiddenKeys) {
    if (keys.some((key) => key.includes(forbidden.toLowerCase()))) {
      throw new Error("Unsupported field.");
    }
  }
}

export function publicApplicationView(application: {
  trackingNumber: string;
  status: string;
  submittedAt: Date | null;
  applicant: { legalFirstName: string; preferredName: string | null; legalLastName: string };
  jobOpening: { title: string };
}) {
  const first = application.applicant.preferredName || application.applicant.legalFirstName;
  return {
    trackingNumber: application.trackingNumber,
    applicantName: `${first} ${application.applicant.legalLastName}`,
    position: application.jobOpening.title,
    submittedAt: application.submittedAt,
    status: application.status,
  };
}
