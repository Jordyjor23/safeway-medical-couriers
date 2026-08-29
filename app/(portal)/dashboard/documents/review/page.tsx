import type { Metadata } from "next";
import { DocumentReviewQueue } from "@/components/portal/DocumentReviewQueue";

export const metadata: Metadata = { title: "Needs review" };

export default async function StaffDocumentReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <DocumentReviewQueue portal="staff" searchParams={searchParams} />;
}
