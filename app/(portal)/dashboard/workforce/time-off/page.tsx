import type { Metadata } from "next";
import { acknowledgeCallOff, createTimeOffForEmployee, recordCallOff, setTimeOffStatus } from "@/app/(portal)/dashboard/workforce/actions";
import { prisma } from "@/lib/db";
import { formatBusinessDate } from "@/lib/workforce-time";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "PTO and call-offs" };

export default async function TimeOffPage() {
  const ctx = await requirePermission("timeoff.view");
  const canManage = hasPermission(ctx, "timeoff.manage");
  const [employees, requests, callOffs] = await Promise.all([
    prisma.employee.findMany({ where: { status: { in: ["ACTIVE", "PENDING_ONBOARDING"] } }, orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }] }),
    prisma.timeOffRequest.findMany({ include: { employee: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.callOffRequest.findMany({ include: { employee: true }, orderBy: { reportedAt: "desc" }, take: 200 }),
  ]);
  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-semibold text-navy">PTO, leave & call-offs</h1><p className="mt-2 text-sm text-muted">Employees can submit requests from self-service; managers can review them here.</p></div>
      {canManage ? <div className="grid gap-5 xl:grid-cols-2">
        <form action={createTimeOffForEmployee} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2"><h2 className="text-lg font-semibold text-navy sm:col-span-2">Record time-off request</h2>
          <select name="employeeId" required className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2"><option value="">Employee</option>{employees.map(e=><option key={e.id} value={e.id}>{e.legalFirstName} {e.legalLastName}</option>)}</select>
          <select name="type" className="rounded-lg border border-line px-3 py-2 text-sm"><option value="PTO">PTO</option><option value="SICK">Sick</option><option value="UNPAID">Unpaid</option><option value="BEREAVEMENT">Bereavement</option><option value="OTHER">Other</option></select>
          <input name="hours" type="number" min="0" step="0.25" placeholder="Hours (optional)" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <label className="text-sm">Start<input name="startDate" type="date" required className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label><label className="text-sm">End<input name="endDate" type="date" required className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
          <textarea name="reason" placeholder="Reason / note" rows={2} className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" /><button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Save request</button>
        </form>
        <form action={recordCallOff} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2"><h2 className="text-lg font-semibold text-navy sm:col-span-2">Record call-off</h2>
          <select name="employeeId" required className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2"><option value="">Employee</option>{employees.map(e=><option key={e.id} value={e.id}>{e.legalFirstName} {e.legalLastName}</option>)}</select>
          <label className="text-sm sm:col-span-2">Call-off date<input name="callOffDate" type="date" required className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
          <input name="reason" required placeholder="Reason" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" /><textarea name="notes" rows={2} placeholder="Notes" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" /><button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Record call-off</button>
        </form>
      </div> : null}

      <section><h2 className="text-xl font-semibold text-navy">Time-off requests</h2><div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-paper"><table className="min-w-full text-left text-sm"><thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th>{canManage?<th className="px-4 py-3">Decision</th>:null}</tr></thead><tbody>{requests.length===0?<tr><td colSpan={canManage?6:5} className="px-4 py-8 text-muted">No requests yet.</td></tr>:requests.map(r=><tr key={r.id} className="border-b border-line last:border-0"><td className="px-4 py-3 font-medium text-navy">{r.employee.legalFirstName} {r.employee.legalLastName}</td><td className="px-4 py-3">{r.type}</td><td className="px-4 py-3">{formatBusinessDate(r.startDate)} – {formatBusinessDate(r.endDate)}</td><td className="px-4 py-3">{r.hours?.toString() ?? "—"}</td><td className="px-4 py-3">{r.status}</td>{canManage?<td className="px-4 py-3"><div className="flex gap-2">{r.status==="PENDING"?<><form action={setTimeOffStatus.bind(null,r.id,"APPROVED")}><button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">Approve</button></form><form action={setTimeOffStatus.bind(null,r.id,"DENIED")}><button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">Deny</button></form></>:null}</div></td>:null}</tr>)}</tbody></table></div></section>

      <section id="call-offs"><h2 className="text-xl font-semibold text-navy">Call-offs</h2><div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-paper"><table className="min-w-full text-left text-sm"><thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th>{canManage?<th className="px-4 py-3">Action</th>:null}</tr></thead><tbody>{callOffs.length===0?<tr><td colSpan={canManage?5:4} className="px-4 py-8 text-muted">No call-offs recorded.</td></tr>:callOffs.map(c=><tr key={c.id} className="border-b border-line last:border-0"><td className="px-4 py-3 font-medium text-navy">{c.employee.legalFirstName} {c.employee.legalLastName}</td><td className="px-4 py-3">{formatBusinessDate(c.callOffDate)}</td><td className="px-4 py-3">{c.reason}</td><td className="px-4 py-3">{c.status}</td>{canManage?<td className="px-4 py-3">{c.status==="REPORTED"?<form action={acknowledgeCallOff.bind(null,c.id)}><button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">Acknowledge</button></form>:null}</td>:null}</tr>)}</tbody></table></div></section>
    </div>
  );
}
