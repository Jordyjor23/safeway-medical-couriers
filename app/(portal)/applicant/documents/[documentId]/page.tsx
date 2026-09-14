import { notFound, redirect } from "next/navigation";
import { canAccessManagedDocument } from "@/lib/documents/access";
import { loadManagedDocumentForAccess } from "@/lib/documents/operations";
import { documentFileHref } from "@/lib/documents/display";
import { requirePortal } from "@/lib/rbac";

export default async function ApplicantDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const ctx = await requirePortal("applicant");
  const { documentId } = await params;
  const document = await loadManagedDocumentForAccess(documentId);
  if (!document || !canAccessManagedDocument(ctx, document, "view")) notFound();
  redirect(documentFileHref(document.id));
}
