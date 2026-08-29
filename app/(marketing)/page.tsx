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
