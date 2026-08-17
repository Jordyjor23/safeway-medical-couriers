import type { Metadata } from "next";
import { Compliance } from "@/components/Compliance";
import { HealthcarePartner } from "@/components/HealthcarePartner";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Compliance, Training & Safety",
  description: `${site.name} is a compliance-focused medical courier with HIPAA-trained, OSHA Bloodborne Pathogens trained, and UN3373 Category B trained personnel serving Columbus and Central Ohio.`,
};

export default function CompliancePage() {
  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Healthcare Logistics Built Around Safety & Compliance"
        description="Training, documented procedures, and operational safeguards for regulated medical courier work in Columbus and Central Ohio."
      />
      <Compliance />
      <HealthcarePartner />
    </>
  );
}
