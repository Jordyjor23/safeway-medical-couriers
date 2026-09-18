import type { Metadata } from "next";
import { createShift, deleteDraftShift, setShiftStatus } from "@/app/(portal)/dashboard/workforce/actions";
import { prisma } from "@/lib/db";
import { formatBusinessDateTime } from "@/lib/workforce-time";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Employee schedule" };

export default async function SchedulePage() {
  const ctx = await requirePermission("scheduling.view");
  const canManage = hasPermission(ctx, "scheduling.manage");
  const now = new Date();
  const windowStart = new Date(now.getTime() - 7 * 86_400_000);
  const [employees, shifts] = await Promise.all([
    prisma.employee.findMany({ where: { status: { in: ["ACTIVE", "PENDING_ONBOARDING"] } }, orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }] }),
    prisma.employeeShift.findMany({
      where: { startsAt: { gte: windowStart } },
      include: { employee: true, _count: { select: { timeEntries: true } } },
      orderBy: { startsAt: "asc" },
      take: 250,
    }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Employee schedule</h1>
      <p className="mt-2 text-sm text-muted">Times are shown in Safeway’s America/New_York business timezone.</p>

      {canManage ? (
        <form action={createShift} className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-2">
          <h2 className="text-lg font-semibold text-navy md:col-span-2">Add shift</h2>
          <select name="employeeId" required className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Employee</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.legalFirstName} {employee.legalLastName} · {employee.jobTitle}</option>)}
          </select>
          <input name="assignment" placeholder="Route / assignment" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <label className="text-sm">Start<input name="startsAt" type="datetime-local" required className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
          <label className="text-sm">End<input name="endsAt" type="datetime-local" required className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
          <input name="location" placeholder="Location / site" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="breakMinutes" type="number" min="0" step="1" defaultValue="0" placeholder="Break minutes" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <textarea name="notes" placeholder="Shift notes" rows={2} className="rounded-lg border border-line px-3 py-2 text-sm md:col-span-2" />
          <label className="flex items-center gap-2 text-sm md:col-span-2"><input name="publishNow" type="checkbox" /> Publish immediately so the employee can see it</label>
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Save shift</button>
        </form>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Start</th><th className="px-4 py-3">End</th><th className="px-4 py-3">Assignment</th><th className="px-4 py-3">Status</th>{canManage ? <th className="px-4 py-3">Actions</th> : null}</tr>
          </thead>
          <tbody>
            {shifts.length === 0 ? <tr><td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-muted">No shifts in this window.</td></tr> : shifts.map((shift) => (
              <tr key={shift.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-navy">{shift.employee.legalFirstName} {shift.employee.legalLastName}</td>
                <td className="px-4 py-3">{formatBusinessDateTime(shift.startsAt)}</td>
                <td className="px-4 py-3">{formatBusinessDateTime(shift.endsAt)}</td>
                <td className="px-4 py-3">{shift.assignment ?? shift.location ?? "—"}</td>
                <td className="px-4 py-3">{shift.status}</td>
                {canManage ? <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                  {shift.status === "DRAFT" ? <form action={setShiftStatus.bind(null, shift.id, "PUBLISHED")}><button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">Publish</button></form> : null}
                  {shift.status === "PUBLISHED" ? <form action={setShiftStatus.bind(null, shift.id, "CANCELLED")}><button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">Cancel</button></form> : null}
                  {shift.status === "PUBLISHED" ? <form action={setShiftStatus.bind(null, shift.id, "COMPLETED")}><button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">Complete</button></form> : null}
                  {["DRAFT", "CANCELLED"].includes(shift.status) && shift._count.timeEntries === 0 ? <form action={deleteDraftShift.bind(null, shift.id)}><button className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">Delete</button></form> : null}
                </div></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
