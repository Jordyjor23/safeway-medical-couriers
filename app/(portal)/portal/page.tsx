import { redirect } from "next/navigation";
import { homePathForRoles } from "@/lib/permissions";
import { requireActiveAuth } from "@/lib/rbac";

export default async function PortalHomePage() {
  const ctx = await requireActiveAuth();
  redirect(homePathForRoles(ctx.roles));
}
