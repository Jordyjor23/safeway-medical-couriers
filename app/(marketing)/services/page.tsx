import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { Services } from "@/components/Services";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description: `Medical specimen delivery, laboratory pickups, pharmacy transport, STAT runs, and scheduled routes from ${site.name} in Columbus, Ohio.`,
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Medical Courier Services Built Around Healthcare"
        description="Time-sensitive transportation for specimens, medications, supplies, documents, and recurring healthcare routes across Central Ohio."
      />
      <Services showHeading={false} />
    </>
  );
}
