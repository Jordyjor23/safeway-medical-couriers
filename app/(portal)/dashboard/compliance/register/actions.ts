"use server";

import { revalidatePath } from "next/cache";
import type { CompanyAssignmentAction, CompanyAssignmentAudience } from "@prisma/client";
import {
  activateControlledDocument,
  assignControlledDocument,
  attachOfficialSourceToPackage,
  completeImplementationTask,
} from "@/lib/compliance/register";
import { requireAuth } from "@/lib/rbac";

function revalidateRegister(id?: string) {
  revalidatePath("/dashboard/compliance");
  revalidatePath("/dashboard/compliance/library");
  revalidatePath("/dashboard/compliance/register");
  revalidatePath("/dashboard/compliance/forms");
  revalidatePath("/dashboard/compliance/tasks");
  revalidatePath("/dashboard/compliance/matrix");
  if (id) revalidatePath(`/dashboard/compliance/register/${id}`);
}

export async function attachMasterSourceAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const companyDocumentId = String(formData.get("companyDocumentId") ?? "");
  const result = await attachOfficialSourceToPackage({
    actor: ctx,
    companyDocumentId,
    sourcePackageKey: String(formData.get("sourcePackageKey") ?? "") || null,
  });
  if ("error" in result) return;
  revalidateRegister();
}

export async function assignControlledDocumentAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const controlledDocumentId = String(formData.get("controlledDocumentId") ?? "");
  const result = await assignControlledDocument({
    actor: ctx,
    controlledDocumentId,
    action: String(formData.get("action") ?? "READ") as CompanyAssignmentAction,
    audience: String(formData.get("audience") ?? "ALL_EMPLOYEES") as CompanyAssignmentAudience,
    roleKey: String(formData.get("roleKey") ?? "") || undefined,
    employeeId: String(formData.get("employeeId") ?? "") || undefined,
    jobOpeningId: String(formData.get("jobOpeningId") ?? "") || undefined,
    requirementId: String(formData.get("requirementId") ?? "") || undefined,
  });
  if ("error" in result) return;
  revalidateRegister(controlledDocumentId);
}

export async function completeImplementationTaskAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const result = await completeImplementationTask({
    actor: ctx,
    taskId: String(formData.get("taskId") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  if ("error" in result) return;
  revalidatePath("/dashboard/compliance/tasks");
  revalidatePath("/dashboard/compliance");
}

export async function activateControlledDocumentAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const controlledDocumentId = String(formData.get("controlledDocumentId") ?? "");
  const result = await activateControlledDocument({ actor: ctx, controlledDocumentId });
  if ("error" in result) return;
  revalidateRegister(controlledDocumentId);
}
