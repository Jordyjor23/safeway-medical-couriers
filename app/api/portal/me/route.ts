import { NextResponse } from "next/server";
import { homePathForRoles } from "@/lib/permissions";
import { requireApiAuth } from "@/lib/rbac";

export async function GET() {
  const { error, ctx } = await requireApiAuth();
  if (error || !ctx) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    user: {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      username: ctx.user.username,
      accountStatus: ctx.user.accountStatus,
    },
    roles: ctx.roles,
    permissions: [...ctx.permissions],
    homePath: homePathForRoles(ctx.roles),
  });
}
