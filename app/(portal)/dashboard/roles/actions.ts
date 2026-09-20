"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { OWNER_ONLY_PERMISSIONS, PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/rbac";

function slugify(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export async function createCustomRole(formData: FormData) {
  const ctx = await requirePermission("permission.manage");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;
  const key = slugify(String(formData.get("key") ?? name));
  if (!key) return;
  const existing = await prisma.role.findUnique({ where: { key } });
  if (existing) return;
  await prisma.role.create({
    data: { key, name, description: description || name, system: false },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "role.created",
    targetType: "role",
    targetId: key,
  });
  revalidatePath("/dashboard/roles");
}

export async function saveRolePermissions(formData: FormData) {
  const ctx = await requirePermission("permission.manage");
  const roleId = String(formData.get("roleId") ?? "");
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Role could not be found." } as const;
  if (role.key === "OWNER") return { error: "Owner permissions cannot be reduced." } as const;

  const selected = new Set(
    formData
      .getAll("permission")
      .map((value) => String(value))
      .filter((key) => (PERMISSIONS as readonly string[]).includes(key)),
  );
  const ownerOnlySelected = [...selected].filter((key) =>
    (OWNER_ONLY_PERMISSIONS as readonly string[]).includes(key),
  );
  if (ownerOnlySelected.length) {
    return {
      error: `Owner-only permissions cannot be granted to ${role.name}: ${ownerOnlySelected.join(", ")}.`,
    } as const;
  }

  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...selected] } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (permissions.length) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId,
          permissionId: permission.id,
        })),
      });
    }
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "role.permissions.updated",
    targetType: "role",
    targetId: role.key,
    metadata: { permissionCount: permissions.length },
  });
  revalidatePath("/dashboard/roles");
  return { ok: true, permissionCount: permissions.length } as const;
}
