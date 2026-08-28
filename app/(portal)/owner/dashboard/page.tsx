import { redirect } from "next/navigation";
import { homePathForRoles, isOwnerRole } from "@/lib/permissions";
import { requireActiveAuth } from "@/lib/rbac";

export default async function OwnerAliasPage() {
  const ctx = await requireActiveAuth();
  if (!isOwnerRole(ctx.roles)) redirect(homePathForRoles(ctx.roles));
  redirect("/dashboard");
}
