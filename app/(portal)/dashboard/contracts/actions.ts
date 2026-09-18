"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createContractNumber, createRouteTemplateCode } from "@/lib/ids";
import { requirePermission } from "@/lib/rbac";
import { parseBusinessDate } from "@/lib/workforce-time";
import type { ContractStatus, ContractType } from "@prisma/client";

export async function createContract(formData: FormData) {
  const ctx = await requirePermission("contracts.edit");
  const contract = await prisma.contract.create({
    data: {
      contractNumber: createContractNumber(),
      customerId: String(formData.get("customerId") ?? ""),
      contractType: String(formData.get("contractType") ?? "MASTER_SERVICE") as ContractType,
      serviceType: String(formData.get("serviceType") ?? "") || null,
      effectiveDate: formData.get("effectiveDate") ? parseBusinessDate(String(formData.get("effectiveDate"))) : null,
      expirationDate: formData.get("expirationDate") ? parseBusinessDate(String(formData.get("expirationDate"))) : null,
      billingTerms: String(formData.get("billingTerms") ?? "") || null,
      paymentTerms: String(formData.get("paymentTerms") ?? "") || null,
      status: String(formData.get("status") ?? "DRAFT") as ContractStatus,
      accountManagerId: ctx.user.id,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  const starterRouteTemplateId = String(formData.get("starterRouteTemplateId") ?? "").trim();
  if (starterRouteTemplateId) {
    const source = await prisma.routeTemplate.findFirst({
      where: { id: starterRouteTemplateId, scope: "GENERIC", active: true },
    });
    if (source) {
      await prisma.routeTemplate.create({
        data: {
          templateCode: createRouteTemplateCode(),
          scope: "CONTRACT",
          name: source.name,
          contractId: contract.id,
          customerId: contract.customerId,
          sourceTemplateId: source.id,
          pickupBusinessName: source.pickupBusinessName,
          pickupAddress: source.pickupAddress,
          deliveryBusinessName: source.deliveryBusinessName,
          deliveryAddress: source.deliveryAddress,
          pickupTimeLocal: source.pickupTimeLocal,
          deliverByTimeLocal: source.deliverByTimeLocal,
          operatingDays: source.operatingDays,
          shipmentType: source.shipmentType,
          temperatureRequired: source.temperatureRequired,
          chainOfCustodyRequired: source.chainOfCustodyRequired,
          proofOfDeliveryRequired: source.proofOfDeliveryRequired,
          customerInstructions: source.customerInstructions,
          handlingInstructions: source.handlingInstructions,
          requiredTrainingKeys: source.requiredTrainingKeys,
          requiredCertificationNames: source.requiredCertificationNames,
          requiredDocumentTypes: source.requiredDocumentTypes,
          vehicleRequirement: source.vehicleRequirement,
          estimatedRouteHours: source.estimatedRouteHours,
          routePay: source.routePay,
          createdById: ctx.user.id,
        },
      });
    }
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "contract.created",
    targetType: "contract",
    targetId: contract.id,
  });
  revalidatePath("/dashboard");
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
      effectiveDate: formData.get("effectiveDate") ? parseBusinessDate(String(formData.get("effectiveDate"))) : null,
      expirationDate: formData.get("expirationDate") ? parseBusinessDate(String(formData.get("expirationDate"))) : null,
      renewalDate: formData.get("renewalDate") ? parseBusinessDate(String(formData.get("renewalDate"))) : null,
      billingTerms: String(formData.get("billingTerms") ?? "") || null,
      paymentTerms: String(formData.get("paymentTerms") ?? "") || null,
      status: String(formData.get("status") ?? "DRAFT") as ContractStatus,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  await prisma.routeTemplate.updateMany({
    where: { contractId },
    data: { customerId: contract.customerId },
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "contract.updated",
    targetType: "contract",
    targetId: contract.id,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${contractId}`);
  revalidatePath(`/dashboard/customers/${contract.customerId}`);
}


export async function deleteContract(contractId: string) {
  const ctx = await requirePermission("contracts.delete");
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { _count: { select: { documents: true, amendments: true, routeTemplates: true, deliveries: true } } },
  });
  if (!contract) redirect("/dashboard/contracts");
  if (
    contract.status !== "DRAFT" ||
    contract._count.documents > 0 ||
    contract._count.amendments > 0 ||
    contract._count.routeTemplates > 0 ||
    contract._count.deliveries > 0
  ) {
    throw new Error(
      "Only empty draft contracts can be deleted. Contracts with documents, routes, amendments, or delivery history must be retained and moved to an appropriate inactive status.",
    );
  }
  await prisma.contract.delete({ where: { id: contractId } });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "contract.deleted",
    targetType: "contract",
    targetId: contractId,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/customers/${contract.customerId}`);
  redirect("/dashboard/contracts");
}
