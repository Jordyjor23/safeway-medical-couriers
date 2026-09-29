"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { nextScopedId } from "@/lib/ids";
import { requirePermission } from "@/lib/rbac";
import { parseBusinessDate } from "@/lib/workforce-time";
import type {
  CarrierAgreementStatus,
  CarrierContractStatus,
  CarrierPartnerStatus,
  CarrierPartnerType,
} from "@prisma/client";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function optionalDate(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value ? parseBusinessDate(value) : null;
}

function carrierData(formData: FormData) {
  return {
    legalName: String(formData.get("legalName") ?? "").trim(),
    dba: textValue(formData, "dba"),
    partnerType: String(formData.get("partnerType") ?? "SUBCONTRACTOR") as CarrierPartnerType,
    status: String(formData.get("status") ?? "PROSPECT") as CarrierPartnerStatus,
    contactName: textValue(formData, "contactName"),
    contactEmail: textValue(formData, "contactEmail"),
    contactPhone: textValue(formData, "contactPhone"),
    website: textValue(formData, "website"),
    mcNumber: textValue(formData, "mcNumber"),
    dotNumber: textValue(formData, "dotNumber"),
    headquartersCity: textValue(formData, "headquartersCity"),
    headquartersState: textValue(formData, "headquartersState"),
    serviceRegions: textValue(formData, "serviceRegions"),
    operatingStates: textValue(formData, "operatingStates"),
    equipment: textValue(formData, "equipment"),
    capabilities: textValue(formData, "capabilities"),
    medicalCapabilities: textValue(formData, "medicalCapabilities"),
    availabilityNotes: textValue(formData, "availabilityNotes"),
    rateNotes: textValue(formData, "rateNotes"),
    w9Received: checked(formData, "w9Received"),
    coiReceived: checked(formData, "coiReceived"),
    cargoInsuranceVerified: checked(formData, "cargoInsuranceVerified"),
    autoInsuranceVerified: checked(formData, "autoInsuranceVerified"),
    hipaaVerified: checked(formData, "hipaaVerified"),
    bloodbornePathogensVerified: checked(formData, "bloodbornePathogensVerified"),
    hazmatVerified: checked(formData, "hazmatVerified"),
    backgroundProcessVerified: checked(formData, "backgroundProcessVerified"),
    rateSheetReceived: checked(formData, "rateSheetReceived"),
    insuranceExpiration: optionalDate(formData, "insuranceExpiration"),
    cargoInsuranceExpiration: optionalDate(formData, "cargoInsuranceExpiration"),
    agreementStatus: String(formData.get("agreementStatus") ?? "NOT_STARTED") as CarrierAgreementStatus,
    agreementExpiration: optionalDate(formData, "agreementExpiration"),
    notes: textValue(formData, "notes"),
  };
}

export async function createCarrierPartner(formData: FormData) {
  const ctx = await requirePermission("carrierPartners.edit");
  const data = carrierData(formData);
  if (!data.legalName) throw new Error("Carrier legal name is required.");

  const partner = await prisma.carrierPartner.create({
    data: {
      ...data,
      partnerNumber: await nextScopedId("CAR"),
      createdById: ctx.user.id,
    },
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "carrierPartner.created",
    targetType: "carrierPartner",
    targetId: partner.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/carriers");
  redirect(`/dashboard/carriers/${partner.id}`);
}

export async function updateCarrierPartner(partnerId: string, formData: FormData) {
  const ctx = await requirePermission("carrierPartners.edit");
  const data = carrierData(formData);
  if (!data.legalName) throw new Error("Carrier legal name is required.");

  await prisma.carrierPartner.update({
    where: { id: partnerId },
    data,
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "carrierPartner.updated",
    targetType: "carrierPartner",
    targetId: partnerId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/carriers");
  revalidatePath(`/dashboard/carriers/${partnerId}`);
}

export async function assignCarrierPartnerToContract(partnerId: string, formData: FormData) {
  const ctx = await requirePermission("contracts.edit");
  const contractId = String(formData.get("contractId") ?? "").trim();
  if (!contractId) throw new Error("Contract is required.");

  const partner = await prisma.carrierPartner.findUnique({
    where: { id: partnerId },
    select: { id: true, legalName: true },
  });
  if (!partner) throw new Error("Carrier partner not found.");

  const assignment = await prisma.carrierContractPartner.upsert({
    where: { contractId_carrierPartnerId: { contractId, carrierPartnerId: partnerId } },
    create: {
      contractId,
      carrierPartnerId: partnerId,
      status: String(formData.get("assignmentStatus") ?? "PROPOSED") as CarrierContractStatus,
      role: textValue(formData, "role"),
      serviceScope: textValue(formData, "serviceScope"),
      rateTerms: textValue(formData, "rateTerms"),
      priority: textValue(formData, "priority") ? Number(formData.get("priority")) : null,
      notes: textValue(formData, "assignmentNotes"),
    },
    update: {
      status: String(formData.get("assignmentStatus") ?? "PROPOSED") as CarrierContractStatus,
      role: textValue(formData, "role"),
      serviceScope: textValue(formData, "serviceScope"),
      rateTerms: textValue(formData, "rateTerms"),
      priority: textValue(formData, "priority") ? Number(formData.get("priority")) : null,
      notes: textValue(formData, "assignmentNotes"),
    },
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "carrierPartner.contract.assigned",
    targetType: "carrierPartner",
    targetId: partnerId,
    metadata: { contractId, assignmentId: assignment.id },
  });

  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${contractId}`);
  revalidatePath(`/dashboard/carriers/${partnerId}`);
}

export async function removeCarrierPartnerFromContract(
  partnerId: string,
  assignmentId: string,
) {
  const ctx = await requirePermission("contracts.edit");
  const assignment = await prisma.carrierContractPartner.findFirst({
    where: { id: assignmentId, carrierPartnerId: partnerId },
  });
  if (!assignment) return;

  // Preserve assignment history instead of hard-deleting the relationship.
  // A future award may reactivate the same unique carrier/contract row via upsert.
  await prisma.carrierContractPartner.update({
    where: { id: assignmentId },
    data: { status: "ENDED" },
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "carrierPartner.contract.ended",
    targetType: "carrierPartner",
    targetId: partnerId,
    metadata: { contractId: assignment.contractId, assignmentId },
  });

  revalidatePath(`/dashboard/contracts/${assignment.contractId}`);
  revalidatePath(`/dashboard/carriers/${partnerId}`);
}

export async function deleteCarrierPartner(partnerId: string) {
  const ctx = await requirePermission("carrierPartners.manage");
  const partner = await prisma.carrierPartner.findUnique({
    where: { id: partnerId },
    include: { _count: { select: { contractAssignments: true } } },
  });
  if (!partner) redirect("/dashboard/carriers");

  if (partner._count.contractAssignments > 0 || partner.status === "ACTIVE") {
    throw new Error(
      "Carrier partners with contract history or active status must be retained. Mark the partner inactive instead.",
    );
  }

  await prisma.carrierPartner.delete({ where: { id: partnerId } });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "carrierPartner.deleted",
    targetType: "carrierPartner",
    targetId: partnerId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/carriers");
  redirect("/dashboard/carriers");
}
