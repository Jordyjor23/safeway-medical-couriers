import type { Metadata } from "next";
import { StatusLookupForm } from "@/components/careers/StatusLookupForm";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Application status" };

export default function StatusPage() {
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title="Application status"
        description="Enter your reference number and the email address used on your application. Internal hiring notes are not shown."
      />
      <Container className="max-w-2xl py-16">
        <StatusLookupForm />
      </Container>
    </>
  );
}
