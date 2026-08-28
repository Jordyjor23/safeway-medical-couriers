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
  revalidatePath(`/dashboard/customers/${customerId}`);
}
