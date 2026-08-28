import { redirect } from "next/navigation";
import { homePathForRoles } from "@/lib/permissions";
import { requireAuth } from "@/lib/rbac";

export default async function PortalHomePage() {
  const ctx = await requireAuth();
  if (ctx.user.mustChangePassword) redirect("/set-password");
  redirect(homePathForRoles(ctx.roles));
}
