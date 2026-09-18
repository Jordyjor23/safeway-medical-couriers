import { createTimeEntry, setTimeEntryStatus } from "@/app/(portal)/dashboard/workforce/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export default async function TimecardsPage() {
  const ctx = await requirePermission("workforce.view");
  const canEdit = hasPermission(ctx, "workforce.edit");
  const [employees, entries] = await Promise.all([
    prisma.employee.findMany({ where: { status: { not: "TERMINATED" } }, orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }] }),
    prisma.timeEntry.findMany({ include: { employee: true }, orderBy: [{ workDate: "desc" }, { createdAt: "desc" }], take: 250 }),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold text-navy">Timecards</h1><p className="mt-2 text-sm text-muted">Review employee punches and manually add or correct time when authorized.</p></div>
    {canEdit ? <form action={createTimeEntry} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-3">
      <select name="employeeId" required className="rounded-lg border border-line px-3 py-2"><option value="">Select employee</option>{employees.map(e=><option key={e.id} value={e.id}>{e.legalLastName}, {e.legalFirstName}</option>)}</select>
      <input type="date" name="workDate" required className="rounded-lg border border-line px-3 py-2" />
      <select name="status" defaultValue="SUBMITTED" className="rounded-lg border border-line px-3 py-2"><option value="OPEN">Open</option><option value="SUBMITTED">Submitted</option><option value="APPROVED">Approved</option></select>
      <input type="datetime-local" name="clockIn" className="rounded-lg border border-line px-3 py-2" />
      <input type="datetime-local" name="clockOut" className="rounded-lg border border-line px-3 py-2" />
      <input type="number" min="0" name="breakMinutes" placeholder="Break minutes" className="rounded-lg border border-line px-3 py-2" />
      <input type="number" min="0" step="0.01" name="regularHours" placeholder="Regular hours" className="rounded-lg border border-line px-3 py-2" />
      <input type="number" min="0" step="0.01" name="overtimeHours" placeholder="Overtime hours" className="rounded-lg border border-line px-3 py-2" />
      <input name="notes" placeholder="Adjustment note" className="rounded-lg border border-line px-3 py-2" />
      <button className="w-fit rounded-full bg-navy px-4 py-2 font-semibold text-white">Save timecard</button>
    </form> : null}
    <div className="overflow-x-auto rounded-2xl border border-line bg-paper"><table className="min-w-full text-left text-sm">
      <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">In / out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
      <tbody>{entries.map(e=><tr key={e.id} className="border-b border-line last:border-0"><td className="px-4 py-3">{e.employee.legalFirstName} {e.employee.legalLastName}</td><td className="px-4 py-3">{e.workDate.toLocaleDateString()}</td><td className="px-4 py-3">{e.clockIn?.toLocaleString() ?? "—"}<br/>{e.clockOut?.toLocaleString() ?? "Open"}</td><td className="px-4 py-3">{Number(e.regularHours).toFixed(2)} reg / {Number(e.overtimeHours).toFixed(2)} OT</td><td className="px-4 py-3">{e.status}</td><td className="px-4 py-3">{canEdit ? <div className="flex gap-2">{e.status !== "APPROVED" ? <form action={setTimeEntryStatus.bind(null,e.id,"APPROVED")}><button className="underline">Approve</button></form> : null}{e.status !== "REJECTED" ? <form action={setTimeEntryStatus.bind(null,e.id,"REJECTED")}><button className="underline">Reject</button></form> : null}</div> : "—"}</td></tr>)}</tbody>
    </table></div>
  </div>;
}
