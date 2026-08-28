"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { nextScopedId } from "@/lib/ids";
import { requirePermission } from "@/lib/rbac";
import type { DeliveryStatus } from "@prisma/client";

export async function createDelivery(formData: FormData) {
  const ctx = await requirePermission("delivery.create");
  const driverEmployeeId = String(formData.get("driverEmployeeId") ?? "") || null;
  const delivery = await prisma.delivery.create({
    data: {
      deliveryNumber: await nextScopedId("DLV"),
      customerId: String(formData.get("customerId") ?? ""),
      driverEmployeeId,
      assignedById: ctx.user.id,
      status: driverEmployeeId ? "ASSIGNED" : "DRAFT",
      pickupAddress: String(formData.get("pickupAddress") ?? "").trim(),
      deliveryAddress: String(formData.get("deliveryAddress") ?? "").trim(),
      pickupAt: formData.get("pickupAt") ? new Date(String(formData.get("pickupAt"))) : null,
      deliverBy: formData.get("deliverBy") ? new Date(String(formData.get("deliverBy"))) : null,
      customerInstructions: String(formData.get("customerInstructions") ?? "") || null,
      handlingInstructions: String(formData.get("handlingInstructions") ?? "") || null,
      shipmentType: String(formData.get("shipmentType") ?? "") || null,
      temperatureRequired: String(formData.get("temperatureRequired") ?? "") || null,
      chainOfCustodyRequired: formData.get("chainOfCustodyRequired") === "on",
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "delivery.created",
    targetType: "delivery",
    targetId: delivery.id,
  });
  revalidatePath("/dispatch/dashboard");
  revalidatePath("/operations/dashboard");
  revalidatePath("/driver/dashboard");
}

export async function updateDeliveryStatus(formData: FormData) {
  const ctx = await requirePermission("delivery.update");
  const deliveryId = String(formData.get("deliveryId") ?? "");
  const status = String(formData.get("status") ?? "") as DeliveryStatus;
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { driver: true },
  });
  if (!delivery) return;
  if (ctx.roles.includes("DRIVER") && delivery.driver?.userId !== ctx.user.id) return;
  if (ctx.roles.includes("CUSTOMER") && delivery.customerId !== ctx.user.customerId) return;

  await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      status,
      recipientName: String(formData.get("recipientName") ?? "") || delivery.recipientName,
      deliveryNotes: String(formData.get("deliveryNotes") ?? "") || delivery.deliveryNotes,
    },
  });
  await prisma.deliveryEvent.create({
    data: {
      deliveryId,
      actorUserId: ctx.user.id,
      kind: status,
      note: String(formData.get("note") ?? "") || null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "delivery.status.changed",
    targetType: "delivery",
    targetId: deliveryId,
    metadata: { status },
  });
  revalidatePath("/dispatch/dashboard");
  revalidatePath("/driver/dashboard");
  revalidatePath("/customer/dashboard");
}

export async function createIncident(formData: FormData) {
  const ctx = await requirePermission("incident.view");
  await prisma.incidentReport.create({
    data: {
      reporterUserId: ctx.user.id,
      deliveryId: String(formData.get("deliveryId") ?? "") || null,
      type: String(formData.get("type") ?? "SAFETY") as never,
      title: String(formData.get("title") ?? "").trim(),
      body: String(formData.get("body") ?? "").trim(),
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "incident.created",
    targetType: "incident",
    targetId: ctx.user.id,
  });
  revalidatePath("/driver/dashboard");
  revalidatePath("/employee/dashboard");
  revalidatePath("/operations/dashboard");
}
