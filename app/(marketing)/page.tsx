import type { Metadata } from "next";
import { About } from "@/components/About";
import { Compliance } from "@/components/Compliance";
import { Contact } from "@/components/Contact";
import { HealthcarePartner } from "@/components/HealthcarePartner";
import { Hero } from "@/components/Hero";
import { Industries } from "@/components/Industries";
import { MetricsStrip } from "@/components/marketing/MetricsStrip";
import { PlatformSection } from "@/components/marketing/PlatformSection";
import { QuoteSection } from "@/components/QuoteSection";
import { ServiceArea } from "@/components/ServiceArea";
import { Services } from "@/components/Services";
import { TrustBar } from "@/components/TrustBar";
import { WhyChooseUs } from "@/components/WhyChooseUs";

export const metadata: Metadata = {
  title: "Safeway Couriers | Medical Courier Services in Columbus, Ohio",
  description:
    "Safeway Couriers provides reliable, professional and time-sensitive medical courier services for healthcare organizations throughout Columbus and Central Ohio.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Now Accepting Driver Applications | Safeway Couriers",
    description:
      "Apply to join Safeway Couriers' driver network for upcoming medical courier and independent contractor routes in Columbus and Central Ohio.",
    url: "/",
    type: "website",
    images: [
      {
        url: "/driver-recruiting-share-v3.png",
        width: 1200,
        height: 630,
        alt: "Safeway Couriers — Now Accepting Driver Applications",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Now Accepting Driver Applications | Safeway Couriers",
    description:
      "Apply to join Safeway Couriers' driver network for upcoming medical courier and independent contractor routes in Columbus and Central Ohio.",
    images: ["/driver-recruiting-share-v3.png"],
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <MetricsStrip />
      <TrustBar />
      <Services />
      <PlatformSection />
      <WhyChooseUs />
      <Industries />
      <ServiceArea />
      <About />
      <Compliance />
      <HealthcarePartner />
      <QuoteSection />
      <Contact />
    </>
  );
}
