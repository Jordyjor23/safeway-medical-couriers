import { NextRequest, NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";
import { homePathForRoles } from "@/lib/permissions";
import { requireApiAuth } from "@/lib/rbac";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  const { error, ctx } = await requireApiAuth();
  if (error || !ctx) {
    return withCors(request, error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  return withCors(
    request,
    NextResponse.json({
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
    }),
  );
}
