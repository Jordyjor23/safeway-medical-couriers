import type { PrismaClient } from "@prisma/client";
import {
  PERMISSIONS,
  ROLE_KEYS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from "./permissions";

export async function ensureSystemRoles(db: PrismaClient) {
  for (const key of PERMISSIONS) {
    await db.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        description: key.replaceAll(".", " "),
      },
    });
  }

  for (const key of ROLE_KEYS) {
    const role = await db.role.upsert({
      where: { key },
      update: { name: ROLE_LABELS[key] },
      create: {
        key,
        name: ROLE_LABELS[key],
        description: ROLE_LABELS[key],
        system: true,
      },
    });

    const existingLinks = await db.rolePermission.count({ where: { roleId: role.id } });
    if (existingLinks === 0) {
      const permissionKeys = ROLE_PERMISSIONS[key];
      if (permissionKeys.length === 0) continue;
      const permissions = await db.permission.findMany({
        where: { key: { in: [...permissionKeys] } },
      });
      await db.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    } else {
      await ensureNewDocumentPermissions(db, role.id, ROLE_PERMISSIONS[key]);
    }
  }

  for (const key of ["EMP", "DRV", "CLI", "DLV"]) {
    await db.idSequence.upsert({
      where: { key },
      update: {},
      create: { key, value: 0 },
    });
  }
}

const NEW_DOCUMENT_PERMISSIONS = [
  "documents.editMetadata",
  "documents.verify",
  "documents.archive",
  "documents.download",
  "documents.viewSensitive",
] as const;

async function ensureNewDocumentPermissions(
  db: PrismaClient,
  roleId: string,
  rolePermissions: readonly string[],
) {
  const keys = NEW_DOCUMENT_PERMISSIONS.filter((key) => rolePermissions.includes(key));
  if (!keys.length) return;
  const permissions = await db.permission.findMany({ where: { key: { in: [...keys] } } });
  for (const permission of permissions) {
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      create: { roleId, permissionId: permission.id },
      update: {},
    });
  }
}
