import { reviewLeaveRequest } from "@/app/(portal)/dashboard/workforce/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export default async function LeavePage() {
  const ctx = await requirePermission("workforce.view");
  const canEdit = hasPermission(ctx, "workforce.edit");
  const requests = await prisma.leaveRequest.findMany({ include: { employee: true }, orderBy: { createdAt: "desc" }, take: 250 });
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold text-navy">PTO & call-offs</h1><p className="mt-2 text-sm text-muted">Review time-off and absence requests submitted through employee self-service.</p></div>
    <div className="overflow-x-auto rounded-2xl border border-line bg-paper"><table className="min-w-full text-left text-sm">
      <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
      <tbody>{requests.map(r=><tr key={r.id} className="border-b border-line last:border-0"><td className="px-4 py-3">{r.employee.legalFirstName} {r.employee.legalLastName}</td><td className="px-4 py-3">{r.type.replaceAll("_"," ")}</td><td className="px-4 py-3">{r.startsOn.toLocaleDateString()} – {r.endsOn.toLocaleDateString()}</td><td className="px-4 py-3">{r.hours == null ? "—" : Number(r.hours).toFixed(2)}</td><td className="max-w-xs px-4 py-3">{r.reason ?? "—"}</td><td className="px-4 py-3">{r.status}</td><td className="px-4 py-3">{canEdit && r.status === "PENDING" ? <div className="flex gap-2"><form action={reviewLeaveRequest.bind(null,r.id,"APPROVED")}><button className="underline">Approve</button></form><form action={reviewLeaveRequest.bind(null,r.id,"DENIED")}><button className="underline">Deny</button></form></div> : "—"}</td></tr>)}</tbody>
    </table></div>
  </div>;
}
