"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createRouteTemplateCode } from "@/lib/ids";
import { requirePermission } from "@/lib/rbac";

function textValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() || null;
}

function decimalValue(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number)) throw new Error("Enter a valid number.");
  return number;
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function refreshRoutes(contractId?: string | null) {
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/contracts/routes");
  revalidatePath("/dispatch/dashboard");
  if (contractId) revalidatePath(`/dashboard/contracts/${contractId}`);
}

export async function createGenericRouteTemplate(formData: FormData) {
  const ctx = await requirePermission("contracts.edit");
  const template = await prisma.routeTemplate.create({
    data: {
      templateCode: createRouteTemplateCode(),
      scope: "GENERIC",
      name: String(formData.get("name") ?? "").trim(),
      pickupBusinessName: textValue(formData.get("pickupBusinessName")),
      pickupAddress: textValue(formData.get("pickupAddress")),
      deliveryBusinessName: textValue(formData.get("deliveryBusinessName")),
      deliveryAddress: textValue(formData.get("deliveryAddress")),
      pickupTimeLocal: textValue(formData.get("pickupTimeLocal")),
      deliverByTimeLocal: textValue(formData.get("deliverByTimeLocal")),
      operatingDays: textValue(formData.get("operatingDays")),
      shipmentType: textValue(formData.get("shipmentType")),
      temperatureRequired: textValue(formData.get("temperatureRequired")),
      chainOfCustodyRequired: boolValue(formData, "chainOfCustodyRequired"),
      proofOfDeliveryRequired: boolValue(formData, "proofOfDeliveryRequired"),
      customerInstructions: textValue(formData.get("customerInstructions")),
      handlingInstructions: textValue(formData.get("handlingInstructions")),
      requiredTrainingKeys: textValue(formData.get("requiredTrainingKeys")),
      requiredCertificationNames: textValue(formData.get("requiredCertificationNames")),
      requiredDocumentTypes: textValue(formData.get("requiredDocumentTypes")),
      vehicleRequirement: textValue(formData.get("vehicleRequirement")),
      estimatedRouteHours: decimalValue(formData.get("estimatedRouteHours")),
      routePay: decimalValue(formData.get("routePay")),
      active: true,
      createdById: ctx.user.id,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "route_template.created",
    targetType: "route_template",
    targetId: template.id,
    metadata: { scope: "GENERIC" },
  });
  refreshRoutes();
}

export async function copyRouteTemplateToContract(templateId: string, contractId: string) {
  const ctx = await requirePermission("contracts.edit");
  const [source, contract] = await Promise.all([
    prisma.routeTemplate.findUnique({ where: { id: templateId } }),
    prisma.contract.findUnique({ where: { id: contractId } }),
  ]);
  if (!source) throw new Error("Route template not found.");
  if (!contract) throw new Error("Contract not found.");

  const copy = await prisma.routeTemplate.create({
    data: {
      templateCode: createRouteTemplateCode(),
      scope: "CONTRACT",
      name: source.name,
      contractId,
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

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "route_template.copied_to_contract",
    targetType: "route_template",
    targetId: copy.id,
    metadata: { sourceTemplateId: source.id, contractId },
  });
  refreshRoutes(contractId);
}

export async function updateRouteTemplate(routeTemplateId: string, formData: FormData) {
  const ctx = await requirePermission("contracts.edit");
  const current = await prisma.routeTemplate.findUnique({ where: { id: routeTemplateId } });
  if (!current) throw new Error("Route template not found.");

  const updated = await prisma.routeTemplate.update({
    where: { id: routeTemplateId },
    data: {
      name: String(formData.get("name") ?? current.name).trim() || current.name,
      pickupBusinessName: textValue(formData.get("pickupBusinessName")),
      pickupAddress: textValue(formData.get("pickupAddress")),
      deliveryBusinessName: textValue(formData.get("deliveryBusinessName")),
      deliveryAddress: textValue(formData.get("deliveryAddress")),
      pickupTimeLocal: textValue(formData.get("pickupTimeLocal")),
      deliverByTimeLocal: textValue(formData.get("deliverByTimeLocal")),
      operatingDays: textValue(formData.get("operatingDays")),
      shipmentType: textValue(formData.get("shipmentType")),
      temperatureRequired: textValue(formData.get("temperatureRequired")),
      chainOfCustodyRequired: boolValue(formData, "chainOfCustodyRequired"),
      proofOfDeliveryRequired: boolValue(formData, "proofOfDeliveryRequired"),
      customerInstructions: textValue(formData.get("customerInstructions")),
      handlingInstructions: textValue(formData.get("handlingInstructions")),
      requiredTrainingKeys: textValue(formData.get("requiredTrainingKeys")),
      requiredCertificationNames: textValue(formData.get("requiredCertificationNames")),
      requiredDocumentTypes: textValue(formData.get("requiredDocumentTypes")),
      vehicleRequirement: textValue(formData.get("vehicleRequirement")),
      estimatedRouteHours: decimalValue(formData.get("estimatedRouteHours")),
      routePay: decimalValue(formData.get("routePay")),
      primaryDriverEmployeeId: textValue(formData.get("primaryDriverEmployeeId")),
      backupDriverEmployeeId: textValue(formData.get("backupDriverEmployeeId")),
      active: formData.get("active") === "on",
    },
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "route_template.updated",
    targetType: "route_template",
    targetId: routeTemplateId,
    metadata: {
      scope: updated.scope,
      contractId: updated.contractId,
      primaryDriverEmployeeId: updated.primaryDriverEmployeeId,
      backupDriverEmployeeId: updated.backupDriverEmployeeId,
    },
  });
  refreshRoutes(updated.contractId);
}

export async function archiveRouteTemplate(routeTemplateId: string) {
  const ctx = await requirePermission("contracts.edit");
  const updated = await prisma.routeTemplate.update({
    where: { id: routeTemplateId },
    data: { active: false },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "route_template.archived",
    targetType: "route_template",
    targetId: routeTemplateId,
  });
  refreshRoutes(updated.contractId);
}
