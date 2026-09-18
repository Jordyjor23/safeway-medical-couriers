"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { nextScopedId } from "@/lib/ids";
import { resolveRouteCourier } from "@/lib/route-assignment";
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

function addDaysToDateText(dateText: string, days: number) {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function csvList(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function syncDeliveryShift(args: {
  deliveryId: string;
  employeeId: string | null;
  pickupAt: Date | null;
  deliverBy: Date | null;
  assignment: string;
  location: string;
  createdBy: string;
}) {
  if (!args.employeeId || !args.pickupAt || !args.deliverBy) return;
  await prisma.employeeShift.upsert({
    where: { deliveryId: args.deliveryId },
    update: {
      employeeId: args.employeeId,
      startsAt: args.pickupAt,
      endsAt: args.deliverBy,
      assignment: args.assignment,
      location: args.location,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    create: {
      deliveryId: args.deliveryId,
      employeeId: args.employeeId,
      startsAt: args.pickupAt,
      endsAt: args.deliverBy,
      assignment: args.assignment,
      location: args.location,
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: args.createdBy,
    },
  });
  revalidatePath("/dashboard/workforce");
  revalidatePath("/dashboard/workforce/schedule");
  revalidatePath("/employee/dashboard");
  revalidatePath("/employee/schedule");
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
      pickupBusinessName: String(formData.get("pickupBusinessName") ?? "").trim() || null,
      deliveryBusinessName: String(formData.get("deliveryBusinessName") ?? "").trim() || null,
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
  await syncDeliveryShift({
    deliveryId: delivery.id,
    employeeId: driverEmployeeId,
    pickupAt,
    deliverBy,
    assignment: "Ad-hoc delivery " + delivery.deliveryNumber,
    location: delivery.pickupAddress + " → " + delivery.deliveryAddress,
    createdBy: ctx.user.id,
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

export async function createDeliveryFromRouteTemplate(routeTemplateId: string, formData: FormData) {
  const ctx = await requirePermission("delivery.create");
  const template = await prisma.routeTemplate.findUnique({
    where: { id: routeTemplateId },
    include: { contract: true, customer: true },
  });
  if (!template || template.scope !== "CONTRACT" || !template.contractId || !template.customerId) {
    throw new Error("Contract route template not found.");
  }
  if (!template.active) throw new Error("This contract route is archived.");

  const serviceDate = String(formData.get("serviceDate") ?? "").trim();
  const pickupTimeLocal =
    String(formData.get("pickupTimeLocal") ?? "").trim() || template.pickupTimeLocal || "";
  const deliverByTimeLocal =
    String(formData.get("deliverByTimeLocal") ?? "").trim() || template.deliverByTimeLocal || "";
  if (!serviceDate || !pickupTimeLocal || !deliverByTimeLocal) {
    throw new Error("Service date, pickup time, and deliver-by time are required.");
  }

  const pickupAt = businessLocalToUtc(`${serviceDate}T${pickupTimeLocal}`);
  let deliveryDate = serviceDate;
  let deliverBy = businessLocalToUtc(`${deliveryDate}T${deliverByTimeLocal}`);
  if (!pickupAt || !deliverBy) throw new Error("Route date or time is invalid.");
  if (deliverBy <= pickupAt) {
    deliveryDate = addDaysToDateText(serviceDate, 1);
    deliverBy = businessLocalToUtc(`${deliveryDate}T${deliverByTimeLocal}`);
  }
  if (!deliverBy) throw new Error("Deliver-by time is invalid.");

  const explicitDriverRaw = String(formData.get("driverEmployeeId") ?? "").trim();
  const explicitDriverEmployeeId =
    explicitDriverRaw && explicitDriverRaw !== "AUTO" ? explicitDriverRaw : null;
  const assignment = await resolveRouteCourier({
    routeTemplateId,
    pickupAt,
    deliverBy,
    explicitEmployeeId: explicitDriverEmployeeId,
  });

  const pickupBusinessName =
    String(formData.get("pickupBusinessName") ?? "").trim() || template.pickupBusinessName;
  const deliveryBusinessName =
    String(formData.get("deliveryBusinessName") ?? "").trim() || template.deliveryBusinessName;
  const pickupAddress =
    String(formData.get("pickupAddress") ?? "").trim() || template.pickupAddress || "";
  const deliveryAddress =
    String(formData.get("deliveryAddress") ?? "").trim() || template.deliveryAddress || "";
  if (!pickupAddress || !deliveryAddress) {
    throw new Error("Pickup and delivery addresses are required before assigning the route.");
  }

  const requiredDocumentTypes = csvList(template.requiredDocumentTypes);
  const contractDocumentLinks = requiredDocumentTypes.length
    ? await prisma.contractDocument.findMany({
        where: {
          contractId: template.contractId,
          document: {
            documentType: { in: requiredDocumentTypes },
            lifecycleStatus: { notIn: ["ARCHIVED", "SUPERSEDED"] },
            verificationStatus: { not: "REJECTED" },
          },
        },
        include: { document: true },
      })
    : [];
  const foundDocumentTypes = new Set(
    contractDocumentLinks.map((link) => link.document.documentType).filter((type): type is string => Boolean(type)),
  );
  const missingDocumentTypes = requiredDocumentTypes.filter((type) => !foundDocumentTypes.has(type));
  if (missingDocumentTypes.length) {
    throw new Error(
      `This contract route is missing required paperwork: ${missingDocumentTypes.join(", ")}. Upload/link those documents to the contract before dispatching.`,
    );
  }

  const checklist = buildRouteChecklist(template);
  const delivery = await prisma.delivery.create({
    data: {
      deliveryNumber: await nextScopedId("DLV"),
      customerId: template.customerId,
      contractId: template.contractId,
      routeTemplateId: template.id,
      pickupBusinessName,
      deliveryBusinessName,
      driverEmployeeId: assignment.employeeId,
      assignedById: ctx.user.id,
      status: assignment.employeeId ? "ASSIGNED" : "DRAFT",
      pickupAddress,
      deliveryAddress,
      pickupAt,
      deliverBy,
      customerInstructions: template.customerInstructions,
      handlingInstructions: template.handlingInstructions,
      shipmentType: template.shipmentType,
      temperatureRequired: template.temperatureRequired,
      chainOfCustodyRequired: template.chainOfCustodyRequired,
      proofOfDeliveryRequired: template.proofOfDeliveryRequired,
      checklistItems: { create: checklist },
      documents: {
        create: contractDocumentLinks.map((link) => ({ documentId: link.documentId })),
      },
    },
  });

  await syncDeliveryShift({
    deliveryId: delivery.id,
    employeeId: assignment.employeeId,
    pickupAt,
    deliverBy,
    assignment: template.name + " · " + delivery.deliveryNumber,
    location: pickupAddress + " → " + deliveryAddress,
    createdBy: ctx.user.id,
  });

  if (!assignment.employeeId) {
    const recipients = await prisma.user.findMany({
      where: {
        disabled: false,
        roles: {
          some: {
            role: { key: { in: ["OWNER", "ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] } },
          },
        },
      },
      select: { id: true },
    });
    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((user) => ({
          userId: user.id,
          type: "SYSTEM",
          title: "Route needs courier",
          body: (template.contract?.contractNumber ?? "Contract") + " · " + template.name + " on " + serviceDate + " could not be auto-assigned.",
          href: "/dispatch/dashboard",
          dedupeKey: delivery.id + ":unassigned:" + user.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "delivery.created_from_contract_route",
    targetType: "delivery",
    targetId: delivery.id,
    metadata: {
      contractId: template.contractId,
      routeTemplateId: template.id,
      assignmentSource: assignment.source,
      driverEmployeeId: assignment.employeeId,
      assignmentNotes: assignment.reasons,
      inheritedDocumentTypes: requiredDocumentTypes,
      inheritedDocumentCount: contractDocumentLinks.length,
    },
  });

  refreshDelivery(delivery.id);
  revalidatePath(`/dashboard/contracts/${template.contractId}`);
}

export async function assignDeliveryCourier(deliveryId: string, formData: FormData) {
  const ctx = await requirePermission("delivery.update");
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { routeTemplate: true },
  });
  if (!delivery) throw new Error("Delivery not found.");
  if (!["DRAFT", "ASSIGNED"].includes(delivery.status)) {
    throw new Error("Only draft or assigned routes can be reassigned from Dispatch.");
  }
  if (!delivery.pickupAt || !delivery.deliverBy) {
    throw new Error("Pickup and delivery times are required before assigning a courier.");
  }

  const raw = String(formData.get("driverEmployeeId") ?? "").trim();
  let employeeId: string | null = null;
  let assignmentSource = "MANUAL";

  if (delivery.routeTemplateId) {
    const resolved = await resolveRouteCourier({
      routeTemplateId: delivery.routeTemplateId,
      pickupAt: delivery.pickupAt,
      deliverBy: delivery.deliverBy,
      explicitEmployeeId: raw && raw !== "AUTO" ? raw : null,
      excludeDeliveryId: deliveryId,
    });
    employeeId = resolved.employeeId;
    assignmentSource = resolved.source;
    if (!employeeId) throw new Error("No eligible courier is currently available for this route.");
  } else {
    if (!raw || raw === "AUTO") throw new Error("Choose a courier for an ad-hoc assignment.");
    const employee = await prisma.employee.findFirst({
      where: { id: raw, isDriver: true, status: "ACTIVE" },
      select: { id: true },
    });
    if (!employee) throw new Error("Selected courier is not an active driver.");
    employeeId = employee.id;
  }

  await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      driverEmployeeId: employeeId,
      status: "ASSIGNED",
      assignedById: ctx.user.id,
    },
  });

  await syncDeliveryShift({
    deliveryId,
    employeeId,
    pickupAt: delivery.pickupAt,
    deliverBy: delivery.deliverBy,
    assignment: (delivery.routeTemplate?.name ?? "Delivery") + " · " + delivery.deliveryNumber,
    location: delivery.pickupAddress + " → " + delivery.deliveryAddress,
    createdBy: ctx.user.id,
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "delivery.courier.assigned",
    targetType: "delivery",
    targetId: deliveryId,
    metadata: { employeeId, assignmentSource },
  });
  refreshDelivery(deliveryId);
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
  if (status === "DELIVERED" || status === "CANCELLED") {
    await prisma.employeeShift.updateMany({
      where: { deliveryId },
      data: { status: status === "DELIVERED" ? "COMPLETED" : "CANCELLED" },
    });
    revalidatePath("/dashboard/workforce");
    revalidatePath("/dashboard/workforce/schedule");
    revalidatePath("/employee/schedule");
  }

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
