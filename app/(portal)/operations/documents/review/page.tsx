import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentReviewQueue } from "@/components/portal/DocumentReviewQueue";
import { hasPermission, requirePortal } from "@/lib/rbac";

export const metadata: Metadata = { title: "Needs review" };

export default async function OperationsDocumentReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePortal("operations");
  if (!hasPermission(ctx, "documents.view")) notFound();
  return <DocumentReviewQueue portal="operations" searchParams={searchParams} />;
}
