"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createContractNumber } from "@/lib/ids";
import { requirePermission } from "@/lib/rbac";
import type { ContractStatus, ContractType } from "@prisma/client";

export async function createContract(formData: FormData) {
  const ctx = await requirePermission("contracts.edit");
  const contract = await prisma.contract.create({
    data: {
      contractNumber: createContractNumber(),
      customerId: String(formData.get("customerId") ?? ""),
      contractType: String(formData.get("contractType") ?? "MASTER_SERVICE") as ContractType,
      serviceType: String(formData.get("serviceType") ?? "") || null,
      effectiveDate: formData.get("effectiveDate") ? new Date(String(formData.get("effectiveDate"))) : null,
      expirationDate: formData.get("expirationDate") ? new Date(String(formData.get("expirationDate"))) : null,
      billingTerms: String(formData.get("billingTerms") ?? "") || null,
      paymentTerms: String(formData.get("paymentTerms") ?? "") || null,
      status: String(formData.get("status") ?? "DRAFT") as ContractStatus,
      accountManagerId: ctx.user.id,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "contract.created",
    targetType: "contract",
    targetId: contract.id,
  });
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/customers/${contract.customerId}`);
  redirect(`/dashboard/contracts/${contract.id}`);
}

export async function updateContract(contractId: string, formData: FormData) {
  const ctx = await requirePermission("contracts.edit");
  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: {
      customerId: String(formData.get("customerId") ?? ""),
      contractType: String(formData.get("contractType") ?? "MASTER_SERVICE") as ContractType,
      serviceType: String(formData.get("serviceType") ?? "") || null,
      effectiveDate: formData.get("effectiveDate") ? new Date(String(formData.get("effectiveDate"))) : null,
      expirationDate: formData.get("expirationDate") ? new Date(String(formData.get("expirationDate"))) : null,
      renewalDate: formData.get("renewalDate") ? new Date(String(formData.get("renewalDate"))) : null,
      billingTerms: String(formData.get("billingTerms") ?? "") || null,
      paymentTerms: String(formData.get("paymentTerms") ?? "") || null,
      status: String(formData.get("status") ?? "DRAFT") as ContractStatus,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "contract.updated",
    targetType: "contract",
    targetId: contract.id,
  });
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${contractId}`);
  revalidatePath(`/dashboard/customers/${contract.customerId}`);
}
