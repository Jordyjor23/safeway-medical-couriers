"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { acknowledgeCompanyDocument, acknowledgeControlledDocument } from "@/lib/compliance/library";
import { requirePortal } from "@/lib/rbac";

export async function acknowledgeAssignedDocumentAction(formData: FormData): Promise<void> {
  const ctx = await requirePortal("employee");
  const headerList = await headers();
  const result = await acknowledgeCompanyDocument({
    actor: ctx,
    companyDocumentId: String(formData.get("companyDocumentId") ?? ""),
    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip"),
    userAgent: headerList.get("user-agent"),
  });
  if ("error" in result) return;
  revalidatePath("/employee/dashboard");
  revalidatePath(`/employee/company-documents/${String(formData.get("companyDocumentId") ?? "")}`);
}

export async function acknowledgeAssignedControlledDocumentAction(formData: FormData): Promise<void> {
  const ctx = await requirePortal("employee");
  const headerList = await headers();
  const controlledDocumentId = String(formData.get("controlledDocumentId") ?? "");
  const result = await acknowledgeControlledDocument({
    actor: ctx,
    controlledDocumentId,
    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip"),
    userAgent: headerList.get("user-agent"),
  });
  if ("error" in result) return;
  revalidatePath("/employee/dashboard");
  revalidatePath(`/employee/company-documents/controlled/${controlledDocumentId}`);
}
