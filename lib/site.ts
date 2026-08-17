export const site = {
  name: "Safeway Couriers",
  shortName: "Safeway",
  tagline: "Medical logistics when every minute matters.",
  description:
    "Safeway Couriers provides HIPAA-trained, chain-of-custody medical courier service for hospitals, laboratories, pharmacies, and clinics — including STAT, scheduled routes, and temperature-controlled specimen transport.",
  phone: "(800) 723-3929",
  phoneHref: "tel:+18007233929",
  email: "dispatch@safewaycouriers.com",
  emailHref: "mailto:dispatch@safewaycouriers.com",
  hours: "Dispatch open 24 hours, 365 days",
  address: "Healthcare logistics desk — regional & nationwide coverage",
} as const;

export const nav = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/compliance", label: "Compliance" },
  { href: "/tracking", label: "Tracking" },
  { href: "/contact", label: "Contact" },
] as const;

export const services = [
  {
    href: "/services#stat",
    title: "STAT & same-day",
    summary:
      "On-demand pickup for time-critical specimens, blood products, and surgical supplies — with live dispatch and GPS visibility.",
    details:
      "When a lab result, transplant support item, or missing OR supply cannot wait, our 24/7 desk assigns the nearest qualified courier. You receive pickup confirmation, in-transit updates, and a signed proof of delivery.",
  },
  {
    href: "/services#specimens",
    title: "Lab specimen transport",
    summary:
      "Chain-of-custody handling for blood, urine, tissue, and reference-lab send-outs, including temperature-controlled coolers.",
    details:
      "Couriers are trained on biohazard labeling, spill response, and hold-time requirements. We document who handled the specimen, when it left the floor, and when it arrived at the receiving bench.",
  },
  {
    href: "/services#pharmacy",
    title: "Pharmacy & specialty meds",
    summary:
      "Secure delivery of prescriptions, compounded medications, and specialty drugs between pharmacies, clinics, and infusion suites.",
    details:
      "Temperature-sensitive products travel in validated coolers. Signature capture and sealed-bag protocols keep the chain of custody intact from pharmacist to receiving clinician.",
  },
  {
    href: "/services#routes",
    title: "Scheduled routes",
    summary:
      "Daily and multi-stop circuits for hospitals, draw stations, and reference labs that need predictable windows — not one-off trips.",
    details:
      "We design routes around your cutoff times, courier check-in procedures, and dock constraints. Missed stops are escalated immediately, not discovered at the end of the day.",
  },
  {
    href: "/services#equipment",
    title: "Equipment & supplies",
    summary:
      "Movement of durable medical equipment, instruments, reagents, and clinic restocks with the care of a medical shipment — not a parcel.",
    details:
      "From loaner scopes to point-of-care analyzers, we treat medical cargo as regulated healthcare logistics: labeled, tracked, and handed to the right department.",
  },
  {
    href: "/services#after-hours",
    title: "After-hours coverage",
    summary:
      "Nights, weekends, and holidays staffed by the same dispatch team — so STAT does not mean “leave a voicemail.”",
    details:
      "A live coordinator answers the phone, books the run, and stays on the ticket until delivery is confirmed. No call center scripts. No next-business-day callbacks.",
  },
] as const;

export const steps = [
  {
    n: "01",
    title: "Request pickup",
    body: "Call dispatch or submit a quote. Tell us what is moving, the temperature needs, and the required arrival window.",
  },
  {
    n: "02",
    title: "Assigned courier",
    body: "A HIPAA-trained, background-checked courier is dispatched with the right cooler, labels, and chain-of-custody paperwork.",
  },
  {
    n: "03",
    title: "Documented handoff",
    body: "Pickup is timestamped. Seals, temperatures, and receiving names are recorded so the specimen’s story is complete.",
  },
  {
    n: "04",
    title: "Confirmed delivery",
    body: "GPS tracking, signature capture, and a delivery notice close the loop for your lab, pharmacy, or nursing unit.",
  },
] as const;

export const credentials = [
  "HIPAA-trained couriers",
  "Chain-of-custody documentation",
  "OSHA bloodborne pathogen training",
  "Temperature-controlled transport",
  "GPS tracking & proof of delivery",
  "Cargo insurance on every run",
] as const;
