export const INTERVIEW_SCORECARD_VERSION = "1.1";

export type InterviewWorkerScope = "ALL" | "INDEPENDENT_CONTRACTOR" | "EMPLOYEE";

export type InterviewQuestion = {
  key: string;
  category: string;
  prompt: string;
  guidance: string;
  scope: InterviewWorkerScope;
};

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    key: "experience",
    category: "Experience & reliability",
    prompt: "Tell me about your driving, delivery, healthcare, logistics, or customer-service experience.",
    guidance: "Look for relevant examples, reliability, professionalism, and transferable experience.",
    scope: "ALL",
  },
  {
    key: "interest",
    category: "Experience & reliability",
    prompt: "Why are you interested in medical courier work with Safeway Couriers?",
    guidance: "Look for a realistic understanding of the work, dependability, and service mindset.",
    scope: "ALL",
  },
  {
    key: "availability",
    category: "Experience & reliability",
    prompt: "What days, shifts, service areas, and urgent/STAT availability can you reliably commit to?",
    guidance: "Compare the answer with the application and actual route requirements.",
    scope: "ALL",
  },
  {
    key: "independent_work",
    category: "Experience & reliability",
    prompt: "Tell me about a time you had to work independently without a supervisor physically present.",
    guidance: "Look for ownership, communication, documentation, and follow-through.",
    scope: "ALL",
  },
  {
    key: "attendance",
    category: "Experience & reliability",
    prompt: "Medical courier routes are time-sensitive. How do you make sure you are consistently on time and ready for a scheduled route?",
    guidance: "Look for practical planning, backup plans, communication, and reliable attendance habits.",
    scope: "ALL",
  },
  {
    key: "hipaa",
    category: "Safety & compliance",
    prompt: "How would you protect patient information and maintain HIPAA confidentiality during a delivery?",
    guidance: "Look for privacy awareness, limiting access, secure handling, and escalation when unsure.",
    scope: "ALL",
  },
  {
    key: "chain_of_custody",
    category: "Safety & compliance",
    prompt: "What does chain of custody mean to you, and why is it important in medical courier work?",
    guidance: "Look for documented handoffs, accountability, identity verification, and no undocumented transfers.",
    scope: "ALL",
  },
  {
    key: "sop_following",
    category: "Safety & compliance",
    prompt: "Tell me about a time you had to follow a strict procedure or written SOP. What did you do if something was unclear?",
    guidance: "Look for disciplined process-following, asking for clarification, and avoiding shortcuts.",
    scope: "ALL",
  },
  {
    key: "damaged_package",
    category: "Scenario judgment",
    prompt: "Scenario: You arrive and a specimen package is leaking, damaged, or appears compromised. What do you do?",
    guidance: "Strong answers avoid handling shortcuts, secure the area/package as trained, stop the handoff, notify dispatch/client, and document the exception.",
    scope: "ALL",
  },
  {
    key: "label_mismatch",
    category: "Scenario judgment",
    prompt: "Scenario: The paperwork does not match the specimen label at pickup. What do you do?",
    guidance: "Strong answers do not guess or alter records, pause the handoff, contact the responsible party/dispatch, and document the issue.",
    scope: "ALL",
  },
  {
    key: "late_delivery",
    category: "Scenario judgment",
    prompt: "Scenario: You realize you are going to be late for a time-sensitive pickup or delivery. What do you do?",
    guidance: "Look for early communication, safe driving, accurate ETA updates, and documented escalation.",
    scope: "ALL",
  },
  {
    key: "temperature_exception",
    category: "Scenario judgment",
    prompt: "Scenario: A temperature-controlled shipment appears outside the required range. What do you do?",
    guidance: "Look for stopping normal delivery flow, preserving evidence/conditions, notifying dispatch/client, and following the written SOP.",
    scope: "ALL",
  },
  {
    key: "recipient_unavailable",
    category: "Scenario judgment",
    prompt: "Scenario: You arrive at the destination but the authorized recipient is unavailable and the package cannot be left unattended. What do you do?",
    guidance: "Look for secure custody, no unattended drop-off, contacting dispatch/client, and documenting the delay.",
    scope: "ALL",
  },
  {
    key: "vehicle_breakdown",
    category: "Scenario judgment",
    prompt: "Scenario: Your vehicle breaks down while you are carrying a time-sensitive medical shipment. What do you do first?",
    guidance: "Look for protecting the shipment, contacting dispatch immediately, providing location/status, and following transfer or recovery procedures.",
    scope: "ALL",
  },
  {
    key: "organization",
    category: "Communication & technology",
    prompt: "How do you stay organized with multiple pickups, deadlines, instructions, and proof-of-delivery requirements?",
    guidance: "Look for repeatable organization methods and accurate documentation.",
    scope: "ALL",
  },
  {
    key: "technology",
    category: "Communication & technology",
    prompt: "Are you comfortable using GPS, delivery apps, photos, signatures, and electronic proof-of-delivery tools? Give an example.",
    guidance: "Look for practical comfort with mobile tools and willingness to learn the Safeway workflow.",
    scope: "ALL",
  },
  {
    key: "communication",
    category: "Communication & technology",
    prompt: "How do you communicate when a customer, dispatcher, or facility gives you conflicting instructions?",
    guidance: "Look for calm clarification, escalation, documentation, and avoiding assumptions.",
    scope: "ALL",
  },
  {
    key: "ic_business_readiness",
    category: "Independent courier readiness",
    prompt: "As an independent courier, how do you manage your own schedule, vehicle expenses, insurance, and availability commitments?",
    guidance: "Look for realistic understanding of independent-contractor responsibilities and dependable planning.",
    scope: "INDEPENDENT_CONTRACTOR",
  },
  {
    key: "ic_route_acceptance",
    category: "Independent courier readiness",
    prompt: "How do you decide whether to accept a route or STAT request, and what would make you decline one?",
    guidance: "Look for honest capacity assessment, safety, timing, vehicle readiness, and avoiding overcommitment.",
    scope: "INDEPENDENT_CONTRACTOR",
  },
  {
    key: "ic_backup_plan",
    category: "Independent courier readiness",
    prompt: "What is your backup plan if your vehicle, phone, or navigation equipment becomes unavailable before an accepted route?",
    guidance: "Look for preparedness and prompt communication rather than improvising after the route is already at risk.",
    scope: "INDEPENDENT_CONTRACTOR",
  },
  {
    key: "ic_document_readiness",
    category: "Independent courier readiness",
    prompt: "Are you prepared to keep required business, vehicle, insurance, and training documents current and submit renewals before they expire?",
    guidance: "Look for understanding of ongoing credential and document maintenance.",
    scope: "INDEPENDENT_CONTRACTOR",
  },
  {
    key: "w2_schedule",
    category: "W-2 employee readiness",
    prompt: "Are you able to reliably work the assigned schedule, including required weekends, holidays, on-call periods, or shift changes when applicable?",
    guidance: "Compare with the posted role and the candidate's stated availability.",
    scope: "EMPLOYEE",
  },
  {
    key: "w2_teamwork",
    category: "W-2 employee readiness",
    prompt: "Tell me about a time you worked as part of a team with a dispatcher, supervisor, or coworkers to solve an urgent problem.",
    guidance: "Look for communication, accountability, escalation, and teamwork.",
    scope: "EMPLOYEE",
  },
  {
    key: "w2_coaching",
    category: "W-2 employee readiness",
    prompt: "How do you respond when a supervisor corrects a procedure or gives you coaching after a mistake?",
    guidance: "Look for openness to coaching, accountability, and behavior change.",
    scope: "EMPLOYEE",
  },
  {
    key: "w2_policy",
    category: "W-2 employee readiness",
    prompt: "How do you handle a situation where you disagree with a company policy or procedure but are still responsible for following it?",
    guidance: "Look for professional escalation and policy compliance rather than ignoring the requirement.",
    scope: "EMPLOYEE",
  },
];

export function interviewQuestionsFor(workerClassification: "EMPLOYEE" | "INDEPENDENT_CONTRACTOR") {
  return INTERVIEW_QUESTIONS.filter(
    (question) => question.scope === "ALL" || question.scope === workerClassification,
  );
}

export function interviewMaxScoreFor(workerClassification: "EMPLOYEE" | "INDEPENDENT_CONTRACTOR") {
  return interviewQuestionsFor(workerClassification).length * 5;
}
