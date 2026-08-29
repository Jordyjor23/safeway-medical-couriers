import type { Metadata } from "next";
import { ManagedDocumentDetail } from "@/components/portal/ManagedDocumentDetail";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  return <ManagedDocumentDetail portal="staff" params={params} />;
}
