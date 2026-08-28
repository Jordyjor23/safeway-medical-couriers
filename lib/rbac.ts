import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { accountAllowsLogin } from "@/lib/account-status";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canAccessCustomerTenant,
  canAccessOwnEmployeeRecord,
  canAccessPortal,
  homePathForRoles,
  isOwnerRole,
  type PermissionKey,
  type PortalKind,
} from "@/lib/permissions";

export type AuthContext = {
  user: {
    id: string;
    email: string;
    name: string;
    username?: string | null;
    disabled?: boolean | null;
    twoFactorEnabled?: boolean | null;
    accountStatus?: string;
    mustChangePassword?: boolean;
    customerId?: string | null;
    employeeId?: string | null;
  };
  roles: string[];
  permissions: Set<string>;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      employee: { select: { id: true } },
      customerUser: { select: { customerId: true } },
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });

  if (!dbUser) return null;
  if (!accountAllowsLogin(dbUser)) return null;

  const roles = dbUser.roles.map((assignment) => assignment.role.key);
  const permissions = new Set<string>();
  if (isOwnerRole(roles)) {
    const all = await prisma.permission.findMany({ select: { key: true } });
    for (const permission of all) permissions.add(permission.key);
  } else {
    for (const assignment of dbUser.roles) {
      for (const link of assignment.role.permissions) {
        permissions.add(link.permission.key);
      }
    }
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      username: dbUser.username,
      disabled: dbUser.disabled,
      twoFactorEnabled: dbUser.twoFactorEnabled,
      accountStatus: dbUser.accountStatus,
      mustChangePassword: dbUser.mustChangePassword,
      customerId: dbUser.customerUser?.customerId ?? null,
      employeeId: dbUser.employee?.id ?? null,
    },
    roles,
    permissions,
  };
}

export async function requireAuth() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireActiveAuth() {
  const ctx = await requireAuth();
  if (ctx.user.mustChangePassword) redirect("/set-password");
  return ctx;
}

export async function requirePermission(permission: PermissionKey | string) {
  const ctx = await requireActiveAuth();
  if (isOwnerRole(ctx.roles)) return ctx;
  if (!ctx.permissions.has(permission)) forbidden();
  return ctx;
}

export async function requirePortal(kind: PortalKind) {
  const ctx = await requireActiveAuth();
  if (!canAccessPortal(ctx.roles, kind)) {
    redirect(homePathForRoles(ctx.roles));
  }
  return ctx;
}

export async function requireApiAuth() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      ctx: null,
    };
  }
  if (ctx.user.mustChangePassword) {
    return {
      error: NextResponse.json({ error: "Password change required." }, { status: 403 }),
      ctx: null,
    };
  }
  return { error: null, ctx };
}

export async function requireApiPermission(permission: PermissionKey | string) {
  const result = await requireApiAuth();
  if (result.error || !result.ctx) return result;
  if (!isOwnerRole(result.ctx.roles) && !result.ctx.permissions.has(permission)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      ctx: null,
    };
  }
  return { error: null, ctx: result.ctx };
}

export function assertSameCustomer(ctx: AuthContext, customerId: string, authorizedCustomerId?: string | null) {
  const allowed = authorizedCustomerId ?? ctx.user.customerId;
  if (!canAccessCustomerTenant(ctx.roles, allowed, customerId)) {
    forbidden();
  }
}

export function assertSameEmployee(ctx: AuthContext, employeeId: string) {
  if (!canAccessOwnEmployeeRecord(ctx.roles, ctx.user.employeeId, employeeId)) {
    forbidden();
  }
}

export function hasPermission(ctx: AuthContext, permission: PermissionKey | string) {
  return isOwnerRole(ctx.roles) || ctx.permissions.has(permission);
}
