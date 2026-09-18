"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { nextScopedId } from "@/lib/ids";
import { buildRouteChecklist, courierSignoffRole } from "@/lib/route-packet";
import { requirePermission } from "@/lib/rbac";
import { businessLocalToUtc } from "@/lib/workforce-time";
import type {
  DeliveryChecklistStatus,
  DeliverySignoffRole,
  DeliveryStatus,
} from "@prisma/client";

async function getAuthorizedDelivery(ctx: Awaited<ReturnType<typeof requirePermission>>, deliveryId: string) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      driver: true,
      checklistItems: { orderBy: { sortOrder: "asc" } },
      signoffs: { orderBy: { signedAt: "asc" } },
    },
  });
  if (!delivery) throw new Error("Delivery not found.");
  if (ctx.roles.includes("DRIVER") && delivery.driver?.userId !== ctx.user.id) {
    throw new Error("This assignment is not assigned to you.");
  }
  if (ctx.roles.includes("CUSTOMER") && delivery.customerId !== ctx.user.customerId) {
    throw new Error("This delivery is not available to this customer account.");
  }
  return delivery;
}

function refreshDelivery(deliveryId: string) {
  revalidatePath("/dispatch/dashboard");
  revalidatePath("/operations/dashboard");
  revalidatePath("/driver/dashboard");
  revalidatePath("/customer/dashboard");
  revalidatePath(`/dashboard/deliveries/${deliveryId}`);
  revalidatePath(`/dispatch/deliveries/${deliveryId}`);
}

export async function createDelivery(formData: FormData) {
  const ctx = await requirePermission("delivery.create");
  const driverEmployeeId = String(formData.get("driverEmployeeId") ?? "") || null;
  const pickupRaw = String(formData.get("pickupAt") ?? "");
  const deliverRaw = String(formData.get("deliverBy") ?? "");
  const pickupAt = pickupRaw ? businessLocalToUtc(pickupRaw) : null;
  const deliverBy = deliverRaw ? businessLocalToUtc(deliverRaw) : null;
  if ((pickupRaw && !pickupAt) || (deliverRaw && !deliverBy)) {
    throw new Error("Pickup or delivery time is invalid.");
  }

  const temperatureRequired = String(formData.get("temperatureRequired") ?? "").trim() || null;
  const chainOfCustodyRequired = formData.get("chainOfCustodyRequired") === "on";
  const proofOfDeliveryRequired =
    formData.has("proofOfDeliveryRequired") ? formData.get("proofOfDeliveryRequired") === "on" : true;
  const checklist = buildRouteChecklist({
    chainOfCustodyRequired,
    temperatureRequired,
    proofOfDeliveryRequired,
  });

  const delivery = await prisma.delivery.create({
    data: {
      deliveryNumber: await nextScopedId("DLV"),
      customerId: String(formData.get("customerId") ?? ""),
      driverEmployeeId,
      assignedById: ctx.user.id,
      status: driverEmployeeId ? "ASSIGNED" : "DRAFT",
      pickupAddress: String(formData.get("pickupAddress") ?? "").trim(),
      deliveryAddress: String(formData.get("deliveryAddress") ?? "").trim(),
      pickupAt,
      deliverBy,
      customerInstructions: String(formData.get("customerInstructions") ?? "") || null,
      handlingInstructions: String(formData.get("handlingInstructions") ?? "") || null,
      shipmentType: String(formData.get("shipmentType") ?? "") || null,
      temperatureRequired,
      chainOfCustodyRequired,
      proofOfDeliveryRequired,
      checklistItems: { create: checklist },
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "delivery.created",
    targetType: "delivery",
    targetId: delivery.id,
    metadata: { routePacketItems: checklist.length },
  });
  refreshDelivery(delivery.id);
}

export async function initializeDeliveryPacket(deliveryId: string) {
  const ctx = await requirePermission("delivery.update");
  const delivery = await getAuthorizedDelivery(ctx, deliveryId);
  const items = buildRouteChecklist(delivery);
  for (const item of items) {
    await prisma.deliveryChecklistItem.upsert({
      where: { deliveryId_key: { deliveryId, key: item.key } },
      update: {},
      create: { deliveryId, ...item },
    });
  }
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "delivery.packet.initialized",
    targetType: "delivery",
    targetId: deliveryId,
    metadata: { items: items.length },
  });
  refreshDelivery(deliveryId);
}

export async function setDeliveryChecklistItem(itemId: string, formData: FormData) {
  const ctx = await requirePermission("delivery.update");
  const item = await prisma.deliveryChecklistItem.findUnique({
    where: { id: itemId },
    include: { delivery: { include: { driver: true } } },
  });
  if (!item) throw new Error("Route task not found.");
  if (ctx.roles.includes("DRIVER") && item.delivery.driver?.userId !== ctx.user.id) {
    throw new Error("This route task is not assigned to you.");
  }

  const requested = String(formData.get("status") ?? "COMPLETED") as DeliveryChecklistStatus;
  const status: DeliveryChecklistStatus =
    ctx.roles.includes("DRIVER") && requested === "WAIVED" ? "PENDING" : requested;
  const complete = status === "COMPLETED" || status === "WAIVED";
  await prisma.deliveryChecklistItem.update({
    where: { id: itemId },
    data: {
      status,
      completedAt: complete ? new Date() : null,
      completedByUserId: complete ? ctx.user.id : null,
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: `delivery.checklist.${status.toLowerCase()}`,
    targetType: "delivery_checklist_item",
    targetId: itemId,
    metadata: { deliveryId: item.deliveryId, key: item.key },
  });
  refreshDelivery(item.deliveryId);
}

export async function signDeliveryPacket(deliveryId: string, formData: FormData) {
  const ctx = await requirePermission("delivery.update");
  const delivery = await getAuthorizedDelivery(ctx, deliveryId);
  const role = String(formData.get("role") ?? "COURIER") as DeliverySignoffRole;
  const signerName = String(formData.get("signerName") ?? "").trim();
  const signatureText = String(formData.get("signatureText") ?? "").trim();
  const signerTitle = String(formData.get("signerTitle") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const attested = formData.get("attested") === "on";

  if (!signerName || !signatureText || !attested) {
    throw new Error("Signer name, typed signature, and attestation are required.");
  }

  if (ctx.roles.includes("DRIVER")) {
    const expected = courierSignoffRole(delivery.driver?.classification);
    if (![expected, "RECIPIENT"].includes(role)) {
      throw new Error("Drivers may only record their own certification or the recipient sign-off.");
    }
  }

  const signoff = await prisma.deliverySignoff.create({
    data: {
      deliveryId,
      role,
      signerName,
      signerTitle,
      signatureText,
      attested,
      notes,
      signedByUserId: ctx.user.id,
    },
  });

  if (role === "RECIPIENT") {
    const proofItem = delivery.checklistItems.find((item) => item.key === "proof_of_delivery");
    if (proofItem && proofItem.status !== "COMPLETED") {
      await prisma.deliveryChecklistItem.update({
        where: { id: proofItem.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          completedByUserId: ctx.user.id,
          note: `Recipient sign-off: ${signerName}`,
        },
      });
    }
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "delivery.packet.signed",
    targetType: "delivery_signoff",
    targetId: signoff.id,
    metadata: { deliveryId, role, signerName },
  });
  refreshDelivery(deliveryId);
}

export async function updateDeliveryStatus(formData: FormData) {
  const ctx = await requirePermission("delivery.update");
  const deliveryId = String(formData.get("deliveryId") ?? "");
  const status = String(formData.get("status") ?? "") as DeliveryStatus;
  const delivery = await getAuthorizedDelivery(ctx, deliveryId);

  if (status === "DELIVERED") {
    if (delivery.checklistItems.length === 0) {
      throw new Error("Initialize the route packet before completing this delivery.");
    }
    const incomplete = delivery.checklistItems.filter(
      (item) => item.required && item.status !== "COMPLETED" && item.status !== "WAIVED",
    );
    if (incomplete.length) {
      throw new Error(`Complete the required route packet tasks first: ${incomplete.map((item) => item.label).join(", ")}`);
    }
    if (delivery.driver) {
      const requiredDriverRole = courierSignoffRole(delivery.driver.classification);
      if (!delivery.signoffs.some((signoff) => signoff.role === requiredDriverRole && signoff.attested)) {
        throw new Error(`${requiredDriverRole === "CONTRACTOR" ? "Contractor" : "Courier"} sign-off is required before completion.`);
      }
    }
    if (
      delivery.proofOfDeliveryRequired &&
      !delivery.signoffs.some((signoff) => signoff.role === "RECIPIENT" && signoff.attested)
    ) {
      throw new Error("Recipient sign-off is required before completion.");
    }
  }

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
  refreshDelivery(deliveryId);
}

export async function createIncident(formData: FormData) {
  const ctx = await requirePermission("incident.view");
  const deliveryId = String(formData.get("deliveryId") ?? "") || null;
  await prisma.incidentReport.create({
    data: {
      reporterUserId: ctx.user.id,
      deliveryId,
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
  if (deliveryId) refreshDelivery(deliveryId);
}
