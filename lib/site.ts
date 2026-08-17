export const site = {
  name: "Safeway Couriers",
  legalName: "Safeway Couriers",
  url: "https://www.safewaycouriers.com",
  tagline: "Medical Deliveries That Can't Afford to Be Late.",
  description:
    "Safeway Couriers provides reliable, professional and time-sensitive medical courier services for healthcare organizations throughout Columbus and Central Ohio.",
  seoTitle: "Safeway Couriers | Medical Courier Services in Columbus, Ohio",
  street: "1747 Olentangy River Rd, Suite 1023",
  city: "Columbus",
  state: "Ohio",
  zip: "43212",
  region: "Columbus and Central Ohio",
  phone: "[Business Phone]",
  email: "[Business Email]",
  year: 2026,
  showInsuredBadge: false,
  showBackgroundScreenedBadge: false,
} as const;

export const addressLines = [
  site.street,
  `${site.city}, ${site.state} ${site.zip}`,
] as const;

export const fullAddress = `${site.street}, ${site.city}, ${site.state} ${site.zip}`;

export const nav = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/#industries", label: "Industries We Serve" },
  { href: "/#service-area", label: "Service Area" },
  { href: "/#why-choose-us", label: "Why Choose Us" },
  { href: "/#compliance", label: "Compliance" },
  { href: "/#contact", label: "Contact" },
] as const;

export const footerNav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/#industries", label: "Industries" },
  { href: "/#service-area", label: "Service Area" },
  { href: "/quote", label: "Request a Quote" },
  { href: "/contact", label: "Contact" },
  { href: "/compliance", label: "Compliance" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

export const trustItems = [
  {
    key: "reliable",
    title: "Reliable Service",
    body: "Consistent pickup and delivery that healthcare teams can plan around.",
  },
  {
    key: "secure",
    title: "Secure Handling",
    body: "Careful custody of specimens, medications, supplies, and documents.",
  },
  {
    key: "timely",
    title: "Time-Sensitive Delivery",
    body: "Priority movement for STAT runs and tight laboratory windows.",
  },
  {
    key: "communication",
    title: "Professional Communication",
    body: "Clear updates from request through confirmed drop-off.",
  },
] as const;

export const services = [
  {
    id: "specimens",
    title: "Medical Specimen Delivery",
    summary:
      "Careful and time-sensitive transportation of laboratory specimens and testing materials.",
  },
  {
    id: "lab-pickups",
    title: "Laboratory Pickups",
    summary:
      "Scheduled and on-demand pickup services for laboratories, clinics, physician offices, and healthcare facilities.",
  },
  {
    id: "pharmacy",
    title: "Pharmacy & Medication Delivery",
    summary:
      "Reliable transportation solutions for pharmacies and healthcare organizations requiring medication delivery.",
  },
  {
    id: "supplies",
    title: "Medical Supplies & Equipment",
    summary:
      "Transportation of medical supplies, equipment, devices, and other healthcare materials.",
  },
  {
    id: "routes",
    title: "Scheduled Routes",
    summary:
      "Recurring courier routes customized around the daily operations of healthcare organizations.",
  },
  {
    id: "stat",
    title: "STAT & Urgent Delivery",
    summary:
      "Priority transportation for medical deliveries requiring immediate or expedited service.",
  },
  {
    id: "documents",
    title: "Medical Documents",
    summary:
      "Secure transportation of confidential healthcare documents and business materials.",
  },
] as const;

export const whyFeatures = [
  {
    key: "dependable",
    title: "Dependable",
    body: "Healthcare organizations need a courier partner they can count on. We prioritize consistent pickup and delivery service.",
  },
  {
    key: "responsive",
    title: "Responsive",
    body: "Clear communication and responsive service help our clients stay informed throughout the delivery process.",
  },
  {
    key: "healthcare",
    title: "Healthcare Focused",
    body: "Our services are designed specifically around the transportation needs of healthcare organizations.",
  },
  {
    key: "flexible",
    title: "Flexible",
    body: "From recurring routes to urgent deliveries, our services can be tailored to fit different operational needs.",
  },
] as const;

export const industries = [
  {
    key: "hospitals",
    title: "Hospitals",
    body: "Coordinated pickup and delivery support for hospital departments that depend on timely movement of medical materials.",
  },
  {
    key: "labs",
    title: "Medical Laboratories",
    body: "Scheduled and on-demand courier service aligned with laboratory workflows and cutoff times.",
  },
  {
    key: "pharmacies",
    title: "Pharmacies",
    body: "Reliable transportation between pharmacies, clinics, and healthcare sites that need medication moved with care.",
  },
  {
    key: "physicians",
    title: "Physician Offices",
    body: "Convenient pickup and delivery for practices sending specimens, supplies, and documents throughout the day.",
  },
  {
    key: "urgent-care",
    title: "Urgent Care Centers",
    body: "Responsive courier support when urgent care sites need materials moved without waiting on the next business day.",
  },
  {
    key: "dental",
    title: "Dental Offices",
    body: "Professional delivery of dental lab work, supplies, and related healthcare materials.",
  },
  {
    key: "nursing",
    title: "Nursing & Assisted Living Facilities",
    body: "Dependable transportation connecting long-term care communities with pharmacies, labs, and medical partners.",
  },
  {
    key: "supply",
    title: "Medical Supply Companies",
    body: "Local distribution support for suppliers restocking clinics, hospitals, and care facilities across Central Ohio.",
  },
  {
    key: "specialty",
    title: "Specialty Clinics",
    body: "Courier service tailored to infusion, imaging, and other specialty settings with precise delivery windows.",
  },
  {
    key: "healthcare-orgs",
    title: "Healthcare Organizations",
    body: "A single courier partner for health systems, networks, and groups that need consistent regional coverage.",
  },
] as const;

export const communities = [
  "Columbus",
  "Dublin",
  "Upper Arlington",
  "Westerville",
  "Hilliard",
  "Gahanna",
  "Grove City",
  "Reynoldsburg",
  "Worthington",
  "Delaware",
  "Pickerington",
  "New Albany",
] as const;

export const complianceItems = [
  {
    key: "hipaa",
    title: "HIPAA-Trained",
    body: "Our team is trained in the proper handling and protection of confidential patient and healthcare information. Safeway Couriers maintains privacy and security procedures designed to protect protected health information throughout the delivery process.",
  },
  {
    key: "osha",
    title: "OSHA Bloodborne Pathogens Trained",
    body: "Applicable Safeway Couriers personnel complete Bloodborne Pathogens training and follow established exposure-control, PPE, handling, and incident-response procedures when transporting materials that may involve occupational exposure.",
  },
  {
    key: "dot",
    title: "DOT Medical Specimen Transportation Training",
    body: "Applicable personnel are trained in transportation requirements relevant to regulated medical specimens and biological materials transported by Safeway Couriers.",
  },
  {
    key: "un3373",
    title: "UN3373 / Biological Substance Category B Training",
    body: "Applicable couriers handling Biological Substance, Category B shipments are trained in applicable packaging, labeling, handling, and transportation requirements.",
  },
  {
    key: "custody",
    title: "Chain-of-Custody Procedures",
    body: "Safeway Couriers maintains documented pickup, transfer, transportation, and delivery procedures designed to maintain accountability from origin to destination.",
  },
  {
    key: "handling",
    title: "Specimen Handling Procedures",
    body: "Medical specimens are transported according to applicable handling instructions, delivery timelines, packaging requirements, and client-specific protocols.",
  },
  {
    key: "privacy",
    title: "Privacy & Confidentiality",
    body: "All couriers are required to maintain the confidentiality of medical information and follow Safeway Couriers privacy and information-security policies.",
  },
  {
    key: "spill",
    title: "Spill & Exposure Response",
    body: "Safeway Couriers maintains procedures for responding to spills, damaged packages, exposure incidents, and other transportation-related events.",
  },
  {
    key: "records",
    title: "Courier Training & Documentation",
    body: "Training records and applicable compliance documentation are maintained for personnel performing regulated medical courier services.",
  },
] as const;

export const trustBadges = [
  { key: "hipaa", label: "HIPAA-Trained", optional: false },
  { key: "bbp", label: "Bloodborne Pathogens Trained", optional: false },
  { key: "dot", label: "DOT Specimen Transport Training", optional: false },
  { key: "un3373", label: "UN3373 / Category B Training", optional: false },
  { key: "custody", label: "Chain-of-Custody Procedures", optional: false },
  {
    key: "insured",
    label: "Insured",
    optional: true,
    flag: "showInsuredBadge",
  },
  {
    key: "screened",
    label: "Background-Screened Couriers",
    optional: true,
    flag: "showBackgroundScreenedBadge",
  },
] as const;

export const partnerHighlights = [
  "Documented courier training",
  "Chain-of-custody procedures",
  "Proof-of-delivery procedures",
  "Confidentiality requirements",
  "Incident and spill-response procedures",
  "Vehicle and equipment standards",
  "Client-specific delivery protocols",
  "Background-screening procedures",
  "Insurance documentation",
  "Recurring route and STAT delivery procedures",
] as const;

export const organizationTypes = [
  "Hospital",
  "Laboratory",
  "Pharmacy",
  "Clinic",
  "Physician Office",
  "Nursing Facility",
  "Medical Supply Company",
  "Other",
] as const;

export const serviceNeededOptions = [
  "Scheduled Route",
  "Medical Specimen Delivery",
  "Pharmacy Delivery",
  "Medical Supply Delivery",
  "STAT / Urgent Delivery",
  "Medical Document Delivery",
  "Compliance Packet / Vendor Onboarding",
  "Other",
] as const;

export const frequencyOptions = [
  "One-Time",
  "Daily",
  "Multiple Times Per Week",
  "Weekly",
  "Recurring Route",
  "On-Demand",
  "Not Sure Yet",
] as const;

export function visibleTrustBadges() {
  return trustBadges.filter((badge) => {
    if (!badge.optional) return true;
    if (badge.flag === "showInsuredBadge") return site.showInsuredBadge;
    if (badge.flag === "showBackgroundScreenedBadge") {
      return site.showBackgroundScreenedBadge;
    }
    return false;
  });
}
