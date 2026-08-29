import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManagedDocumentDetail } from "@/components/portal/ManagedDocumentDetail";
import { hasPermission, requirePortal } from "@/lib/rbac";

export const metadata: Metadata = { title: "Document" };

export default async function OperationsDocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const ctx = await requirePortal("operations");
  if (!hasPermission(ctx, "documents.view")) notFound();
  return <ManagedDocumentDetail portal="operations" params={params} />;
}
