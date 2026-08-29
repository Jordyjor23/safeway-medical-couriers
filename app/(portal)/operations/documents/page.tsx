import type { Metadata } from "next";
import { DocumentLibrary } from "@/components/portal/DocumentLibrary";
import { hasPermission, requirePortal } from "@/lib/rbac";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Documents" };

export default async function OperationsDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePortal("operations");
  if (!hasPermission(ctx, "documents.view")) notFound();
  return <DocumentLibrary portal="operations" searchParams={searchParams} />;
}
