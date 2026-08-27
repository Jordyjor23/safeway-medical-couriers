import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  isOwnerRole,
  permissionsForRoles,
  type PermissionKey,
  type RoleKey,
} from "@/lib/permissions";

export type AuthContext = {
  user: {
    id: string;
    email: string;
    name: string;
    disabled?: boolean | null;
    twoFactorEnabled?: boolean | null;
  };
  roles: RoleKey[];
  permissions: Set<PermissionKey>;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  if ("disabled" in session.user && session.user.disabled) {
    return null;
  }

  const assignments = await prisma.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true },
  });

  const roles = assignments.map((assignment) => assignment.role.key as RoleKey);

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      disabled: "disabled" in session.user ? Boolean(session.user.disabled) : false,
      twoFactorEnabled: session.user.twoFactorEnabled,
    },
    roles,
    permissions: permissionsForRoles(roles),
  };
}

export async function requireAuth() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requirePermission(permission: PermissionKey) {
  const ctx = await requireAuth();
  if (isOwnerRole(ctx.roles)) return ctx;
  if (!ctx.permissions.has(permission)) forbidden();
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
  return { error: null, ctx };
}

export async function requireApiPermission(permission: PermissionKey) {
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
  if (isOwnerRole(ctx.roles)) return;
  if (ctx.roles.includes("CUSTOMER") && authorizedCustomerId !== customerId) {
    forbidden();
  }
}

export function assertSameEmployee(ctx: AuthContext, employeeUserId: string) {
  if (isOwnerRole(ctx.roles)) return;
  if (ctx.roles.length === 1 && ctx.roles[0] === "EMPLOYEE" && ctx.user.id !== employeeUserId) {
    forbidden();
  }
}

export function hasPermission(ctx: AuthContext, permission: PermissionKey) {
  return isOwnerRole(ctx.roles) || ctx.permissions.has(permission);
}
