import { redirect } from "next/navigation";

export default function LegacyRoleDashboardRedirect() {
  redirect("/dashboard");
}
