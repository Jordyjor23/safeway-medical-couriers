"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
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
  if (!role) return;
  if (role.key === "OWNER") return;

  const selected = new Set(
    formData
      .getAll("permission")
      .map((value) => String(value))
      .filter((key) => (PERMISSIONS as readonly string[]).includes(key)),
  );
  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...selected] } },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (permissions.length) {
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId,
        permissionId: permission.id,
      })),
    });
  }
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "role.permissions.updated",
    targetType: "role",
    targetId: role.key,
  });
  revalidatePath("/dashboard/roles");
}
