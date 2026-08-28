"use server";

import { recordAuthEvent } from "@/lib/activation";
import { getAuthContext } from "@/lib/rbac";

export async function recordLogout() {
  const ctx = await getAuthContext();
  if (!ctx) return;
  await recordAuthEvent({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "auth.logout",
    targetId: ctx.user.id,
  });
}
