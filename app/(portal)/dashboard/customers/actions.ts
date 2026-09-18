"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { nextScopedId } from "@/lib/ids";
import { requirePermission } from "@/lib/rbac";
import type { CustomerStatus, CustomerType } from "@prisma/client";

export async function createCustomer(formData: FormData) {
  const ctx = await requirePermission("customers.edit");
  const customer = await prisma.customer.create({
    data: {
      clientNumber: await nextScopedId("CLI"),
      legalName: String(formData.get("legalName") ?? "").trim(),
      dba: String(formData.get("dba") ?? "") || null,
      customerType: String(formData.get("customerType") ?? "OTHER_BUSINESS") as CustomerType,
      status: String(formData.get("status") ?? "PROSPECT") as CustomerStatus,
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      website: String(formData.get("website") ?? "") || null,
      city: String(formData.get("city") ?? "") || null,
      state: String(formData.get("state") ?? "") || null,
      zip: String(formData.get("zip") ?? "") || null,
      addressLine1: String(formData.get("addressLine1") ?? "") || null,
      serviceRequirements: String(formData.get("serviceRequirements") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      accountOwnerId: ctx.user.id,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "customer.created",
    targetType: "customer",
    targetId: customer.id,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${customer.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const ctx = await requirePermission("customers.edit");
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      legalName: String(formData.get("legalName") ?? "").trim(),
      dba: String(formData.get("dba") ?? "") || null,
      customerType: String(formData.get("customerType") ?? "OTHER_BUSINESS") as CustomerType,
      status: String(formData.get("status") ?? "PROSPECT") as CustomerStatus,
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      website: String(formData.get("website") ?? "") || null,
      city: String(formData.get("city") ?? "") || null,
      state: String(formData.get("state") ?? "") || null,
      zip: String(formData.get("zip") ?? "") || null,
      addressLine1: String(formData.get("addressLine1") ?? "") || null,
      addressLine2: String(formData.get("addressLine2") ?? "") || null,
      serviceRequirements: String(formData.get("serviceRequirements") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "customer.updated",
    targetType: "customer",
    targetId: customerId,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}`);
}

export async function addCustomerContact(customerId: string, formData: FormData) {
  const ctx = await requirePermission("customers.edit");
  await prisma.customerContact.create({
    data: {
      customerId,
      name: String(formData.get("name") ?? "").trim(),
      role: String(formData.get("role") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      isPrimary: formData.get("isPrimary") === "on",
      isBilling: formData.get("isBilling") === "on",
      isOperations: formData.get("isOperations") === "on",
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "customer.contact.added",
    targetType: "customer",
    targetId: customerId,
  });
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/customers/${customerId}`);
}


export async function updateCustomerContact(customerId: string, contactId: string, formData: FormData) {
  const ctx = await requirePermission("customers.edit");
  const contact = await prisma.customerContact.findFirst({ where: { id: contactId, customerId } });
  if (!contact) throw new Error("Customer contact not found.");
  await prisma.customerContact.update({
    where: { id: contactId },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      role: String(formData.get("role") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      isPrimary: formData.get("isPrimary") === "on",
      isBilling: formData.get("isBilling") === "on",
      isOperations: formData.get("isOperations") === "on",
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "customer.contact.updated",
    targetType: "customer",
    targetId: customerId,
    metadata: { contactId },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/customers/${customerId}`);
}

export async function deleteCustomerContact(customerId: string, contactId: string) {
  const ctx = await requirePermission("customers.edit");
  const contact = await prisma.customerContact.findFirst({ where: { id: contactId, customerId } });
  if (!contact) return;
  await prisma.customerContact.delete({ where: { id: contactId } });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "customer.contact.deleted",
    targetType: "customer",
    targetId: customerId,
    metadata: { contactId },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string) {
  const ctx = await requirePermission("customers.delete");
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      _count: {
        select: {
          contracts: true,
          documents: true,
          users: true,
          deliveries: true,
        },
      },
    },
  });
  if (!customer) redirect("/dashboard/customers");
  const hasHistory = Object.values(customer._count).some((count) => count > 0);
  if (hasHistory) {
    throw new Error(
      "This customer has linked contracts, documents, users, or deliveries and cannot be hard-deleted. Mark the customer inactive/former to preserve history.",
    );
  }
  await prisma.customer.delete({ where: { id: customerId } });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "customer.deleted",
    targetType: "customer",
    targetId: customerId,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}
