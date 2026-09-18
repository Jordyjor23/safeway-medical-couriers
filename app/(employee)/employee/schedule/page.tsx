import { prisma } from "@/lib/db";
import { requirePortal } from "@/lib/rbac";
import { currentInstant, formatBusinessDateTime } from "@/lib/workforce-time";

export default async function MySchedulePage() {
  const ctx = await requirePortal("employee");
  if (!ctx.user.employeeId) return <p className="text-muted">No employee profile is linked.</p>;
  const now = currentInstant();
  const from = new Date(now.getTime() - 7 * 86_400_000);
  const shifts = await prisma.employeeShift.findMany({ where: { employeeId: ctx.user.employeeId, startsAt: { gte: from }, status: { in: ["PUBLISHED", "COMPLETED", "CANCELLED"] } }, orderBy: { startsAt: "asc" }, take: 100 });
  return <div><h1 className="text-3xl font-semibold text-navy">My schedule</h1><p className="mt-2 text-sm text-muted">Published shifts are shown in Safeway’s America/New_York timezone.</p><div className="mt-6 grid gap-3">{shifts.length===0?<p className="rounded-2xl border border-dashed border-line bg-paper p-6 text-sm text-muted">No published shifts yet.</p>:shifts.map(shift=><div key={shift.id} className="rounded-2xl border border-line bg-paper p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold text-navy">{formatBusinessDateTime(shift.startsAt)} – {formatBusinessDateTime(shift.endsAt)}</p><p className="mt-1 text-sm text-muted">{shift.assignment ?? "Scheduled shift"}{shift.location ? " · " + shift.location : ""}</p></div><span className="text-xs font-semibold text-muted">{shift.status}</span></div>{shift.notes?<p className="mt-3 text-sm text-muted">{shift.notes}</p>:null}</div>)}</div></div>;
}
