import type { Metadata } from "next";
import { DocumentLibrary } from "@/components/portal/DocumentLibrary";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <DocumentLibrary portal="staff" searchParams={searchParams} />;
}
