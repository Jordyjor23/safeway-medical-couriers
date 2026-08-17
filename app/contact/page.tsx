import type { Metadata } from "next";
import { Contact } from "@/components/Contact";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${site.name} in Columbus, Ohio for medical courier quotes, routing, and vendor onboarding.`,
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Contact Safeway Couriers"
        description="Columbus-based medical courier service for healthcare organizations throughout Central Ohio."
      />
      <Contact showHeading={false} />
    </>
  );
}
