import type { Metadata } from "next";
import { About } from "@/components/About";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${site.name}, a medical courier partner for healthcare organizations in Columbus and Central Ohio.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="A Courier Partner Healthcare Organizations Can Depend On"
        description="Dependable, responsive medical courier service built around the daily work of Central Ohio healthcare teams."
      />
      <About showHeading={false} />
    </>
  );
}
