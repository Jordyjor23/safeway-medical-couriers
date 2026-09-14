"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CompanyAssignmentAction, CompanyAssignmentAudience } from "@prisma/client";
import {
  archiveCompanyDocument,
  assignCompanyDocument,
  publishCompanyDocument,
  uploadCompanyLibraryDocument,
} from "@/lib/compliance/library";
import { canManageCompanyLibrary } from "@/lib/compliance/library-access";
import { requireAuth } from "@/lib/rbac";

function revalidateLibrary(id?: string) {
  revalidatePath("/dashboard/compliance");
  revalidatePath("/dashboard/compliance/library");
  revalidatePath("/dashboard/compliance/forms");
  if (id) revalidatePath(`/dashboard/compliance/library/${id}`);
}

export async function uploadCompanyLibraryAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  if (!canManageCompanyLibrary(ctx.roles)) return;
  const result = await uploadCompanyLibraryDocument({ actor: ctx, formData });
  if ("error" in result) return;
  revalidateLibrary(result.companyDocumentId);
  redirect(`/dashboard/compliance/library/${result.companyDocumentId}`);
}

export async function publishCompanyDocumentAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const companyDocumentId = String(formData.get("companyDocumentId") ?? "");
  const result = await publishCompanyDocument({ actor: ctx, companyDocumentId });
  if ("error" in result) return;
  revalidateLibrary(companyDocumentId);
}

export async function archiveCompanyDocumentAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const companyDocumentId = String(formData.get("companyDocumentId") ?? "");
  const result = await archiveCompanyDocument({ actor: ctx, companyDocumentId });
  if ("error" in result) return;
  revalidateLibrary(companyDocumentId);
}

export async function assignCompanyDocumentAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const result = await assignCompanyDocument({
    actor: ctx,
    familyKey: String(formData.get("familyKey") ?? ""),
    companyDocumentId: String(formData.get("companyDocumentId") ?? "") || undefined,
    action: String(formData.get("action") ?? "READ") as CompanyAssignmentAction,
    audience: String(formData.get("audience") ?? "ALL_EMPLOYEES") as CompanyAssignmentAudience,
    roleKey: String(formData.get("roleKey") ?? "") || undefined,
    employeeId: String(formData.get("employeeId") ?? "") || undefined,
    jobOpeningId: String(formData.get("jobOpeningId") ?? "") || undefined,
    requirementId: String(formData.get("requirementId") ?? "") || undefined,
  });
  if ("error" in result) return;
  revalidateLibrary(String(formData.get("companyDocumentId") ?? "") || undefined);
}

export async function clientMeta() {
  const headerList = await headers();
  return {
    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip"),
    userAgent: headerList.get("user-agent"),
  };
}
