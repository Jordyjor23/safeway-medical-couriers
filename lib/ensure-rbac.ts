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

    const permissionKeys = ROLE_PERMISSIONS[key];
    const permissions = permissionKeys.length
      ? await db.permission.findMany({
          where: { key: { in: [...permissionKeys] } },
        })
      : [];

    // System roles are controlled by code. Reconcile stale grants as well as
    // adding missing grants so a removed permission does not survive forever
    // in the database after a deployment.
    await db.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        ...(permissions.length
          ? { permissionId: { notIn: permissions.map((permission) => permission.id) } }
          : {}),
      },
    });

    for (const permission of permissions) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
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

