import {
  ClipboardCheck,
  FileLock,
  LayoutDashboard,
  Radio,
  Shield,
  Smartphone,
  Truck,
  Users,
} from "lucide-react";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/marketing/Reveal";

const capabilities = [
  {
    icon: LayoutDashboard,
    title: "Live delivery management",
    body: "Dispatch creates assignments, tracks status from accept through delivery, and keeps handling notes with every run.",
  },
  {
    icon: Truck,
    title: "Dispatch board",
    body: "Assign drivers, set pickup and deliver-by windows, and flag temperature or chain-of-custody requirements.",
  },
  {
    icon: ClipboardCheck,
    title: "Chain of custody",
    body: "Custody can be required per delivery, with handling instructions carried from dispatch to the driver.",
  },
  {
    icon: FileLock,
    title: "Secure document management",
    body: "Role-based document library for compliance files, delivery records, and proof-of-delivery documents.",
  },
  {
    icon: Users,
    title: "Customer portal",
    body: "Healthcare clients see their own shipments, contracts, and files — not another organization’s records.",
  },
  {
    icon: Smartphone,
    title: "Driver operations",
    body: "Drivers update pickup, transit, and delivery status from a phone-first board, including recipient confirmation.",
  },
  {
    icon: Shield,
    title: "Compliance tracking",
    body: "Training and document status is tracked internally. Status here is operational tracking, not a legal determination.",
  },
  {
    icon: Radio,
    title: "Proof of delivery",
    body: "Completed runs can capture recipient name and notes, with proof-of-delivery files stored in the document system.",
  },
] as const;

const mockRows = [
  { id: "SW-1042", status: "In transit", route: "Riverside Lab → OSU Campus", flag: "Custody" },
  { id: "SW-1043", status: "Pickup", route: "Dublin Pharmacy → Grove City", flag: "STAT" },
  { id: "SW-1044", status: "Delivered", route: "Hilliard Clinic → Core Lab", flag: "POD" },
];

export function PlatformSection() {
  return (
    <section id="platform" className="section-anchor relative overflow-hidden bg-void py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(26,111,181,0.12),transparent_58%)]" />
      <Container className="relative">
        <Reveal>
          <SectionHeading
            light
            eyebrow="The platform"
            title="A medical logistics system, not a black-box courier."
            description="Safeway Couriers runs on its own operations platform — dispatch, custody, documents, and client visibility in one place. The preview below reflects workflows that exist in the product today."
          />
        </Reveal>

        <div className="mkt-split mt-14 grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <PlatformMock />
          </Reveal>

          <div className="order-1 grid gap-4 sm:grid-cols-2 lg:order-2">
            {capabilities.map((item, index) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={index * 50}>
                  <article className="group h-full rounded-2xl border border-white/10 bg-graphite/80 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-medical/40 hover:bg-panel">
                    <Icon
                      className="h-5 w-5 text-medical transition duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                    <h3 className="mt-3 text-sm font-semibold text-mist">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-mist-soft">{item.body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}

function PlatformMock() {
  return (
    <div className="mkt-float relative mx-auto max-w-xl">
      <div className="absolute -inset-6 rounded-[2rem] bg-medical/10 blur-3xl" aria-hidden="true" />
      <div className="mkt-dashboard is-visible relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-charcoal shadow-[0_50px_100px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-sky-300">
              Dispatch · live
            </p>
            <p className="mt-1 text-sm font-semibold text-mist">Central Ohio board</p>
          </div>
          <span className="rounded-full border border-medical/40 bg-medical/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-sky-200">
            Preview
          </span>
        </div>
        <ul className="divide-y divide-white/10">
          {mockRows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold text-mist">{row.id}</p>
                <p className="mt-0.5 text-xs text-mist-soft">{row.route}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-mist">{row.status}</p>
                <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-medical-bright">
                  {row.flag}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-3 gap-px bg-white/10">
          {[
            ["Custody", "Required"],
            ["Documents", "Vaulted"],
            ["Customer", "Visible"],
          ].map(([label, value]) => (
            <div key={label} className="bg-graphite px-3 py-3">
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-mist-soft">{label}</p>
              <p className="mt-1 text-xs font-semibold text-mist">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
