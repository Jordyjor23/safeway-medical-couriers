export const INTERVIEW_SCORECARD_VERSION = "1.0";

export type InterviewQuestion = {
  key: string;
  category: string;
  prompt: string;
  guidance: string;
};

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    key: "experience",
    category: "Experience & reliability",
    prompt: "Tell me about your driving, delivery, healthcare, logistics, or customer-service experience.",
    guidance: "Look for relevant examples, reliability, professionalism, and transferable experience.",
  },
  {
    key: "interest",
    category: "Experience & reliability",
    prompt: "Why are you interested in medical courier work with Safeway Couriers?",
    guidance: "Look for a realistic understanding of the work, dependability, and service mindset.",
  },
  {
    key: "availability",
    category: "Experience & reliability",
    prompt: "What days, shifts, service areas, and urgent/STAT availability can you reliably commit to?",
    guidance: "Compare the answer with the application and actual route requirements.",
  },
  {
    key: "independent_work",
    category: "Experience & reliability",
    prompt: "Tell me about a time you had to work independently without a supervisor physically present.",
    guidance: "Look for ownership, communication, documentation, and follow-through.",
  },
  {
    key: "hipaa",
    category: "Safety & compliance",
    prompt: "How would you protect patient information and maintain HIPAA confidentiality during a delivery?",
    guidance: "Look for privacy awareness, limiting access, secure handling, and escalation when unsure.",
  },
  {
    key: "chain_of_custody",
    category: "Safety & compliance",
    prompt: "What does chain of custody mean to you, and why is it important in medical courier work?",
    guidance: "Look for documented handoffs, accountability, identity verification, and no undocumented transfers.",
  },
  {
    key: "damaged_package",
    category: "Scenario judgment",
    prompt: "You arrive and a specimen package is leaking, damaged, or appears compromised. What do you do?",
    guidance: "Strong answers avoid handling shortcuts, secure the area/package as trained, stop the handoff, notify dispatch/client, and document the exception.",
  },
  {
    key: "label_mismatch",
    category: "Scenario judgment",
    prompt: "The paperwork does not match the specimen label at pickup. What do you do?",
    guidance: "Strong answers do not guess or alter records, pause the handoff, contact the responsible party/dispatch, and document the issue.",
  },
  {
    key: "late_delivery",
    category: "Scenario judgment",
    prompt: "What would you do if you realized you were going to be late for a time-sensitive pickup or delivery?",
    guidance: "Look for early communication, safe driving, accurate ETA updates, and documented escalation.",
  },
  {
    key: "temperature_exception",
    category: "Scenario judgment",
    prompt: "What would you do if a temperature-controlled shipment appeared outside the required range?",
    guidance: "Look for stopping normal delivery flow, preserving evidence/conditions, notifying dispatch/client, and following the written SOP.",
  },
  {
    key: "organization",
    category: "Communication & technology",
    prompt: "How do you stay organized with multiple pickups, deadlines, instructions, and proof-of-delivery requirements?",
    guidance: "Look for repeatable organization methods and accurate documentation.",
  },
  {
    key: "technology",
    category: "Communication & technology",
    prompt: "Are you comfortable using GPS, delivery apps, photos, signatures, and electronic proof-of-delivery tools? Give an example.",
    guidance: "Look for practical comfort with mobile tools and willingness to learn the Safeway workflow.",
  },
];

export const INTERVIEW_MAX_SCORE = INTERVIEW_QUESTIONS.length * 5;
