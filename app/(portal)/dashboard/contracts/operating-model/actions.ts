"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { operatingModelSchema } from "@/lib/operating-model";
import { requirePermission } from "@/lib/rbac";

export type OperatingModelActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  modelId?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function saveOperatingModel(
  _previousState: OperatingModelActionState,
  formData: FormData,
): Promise<OperatingModelActionState> {
  const ctx = await requirePermission("finance.view");
  const parsed = operatingModelSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Fix the highlighted planning inputs and save again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, contractId, notes, ...values } = parsed.data;
  if (contractId) {
    const contractExists = await prisma.contract.count({ where: { id: contractId } });
    if (!contractExists) {
      return { status: "error", message: "The linked contract could not be found. Refresh and try again." };
    }
  }
  const data = {
    ...values,
    contractId: contractId || null,
    notes: notes || null,
  };

  let model;
  if (id) {
    const existing = await prisma.contractOperatingModel.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return { status: "error", message: "That operating model no longer exists. Refresh and try again." };
    }
    model = await prisma.contractOperatingModel.update({ where: { id }, data });
  } else {
    model = await prisma.contractOperatingModel.create({
      data: { ...data, createdById: ctx.user.id },
    });
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: id ? "contract.operating_model.updated" : "contract.operating_model.created",
    targetType: "contract_operating_model",
    targetId: model.id,
  });

  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/contracts/operating-model");
  if (model.contractId) revalidatePath(`/dashboard/contracts/${model.contractId}`);

  if (!id) redirect(`/dashboard/contracts/operating-model?model=${model.id}`);

  return {
    status: "success",
    message: `Saved ${model.name}.`,
    modelId: model.id,
  };
}
