import { createShift, setShiftStatus } from "@/app/(portal)/dashboard/workforce/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export default async function SchedulePage() {
  const ctx = await requirePermission("workforce.view");
  const canEdit = hasPermission(ctx, "workforce.edit");
  const [employees, shifts] = await Promise.all([
    prisma.employee.findMany({ where: { status: { not: "TERMINATED" } }, orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }] }),
    prisma.workShift.findMany({
      include: { employee: true },
      orderBy: { startsAt: "asc" },
      take: 200,
    }),
  ]);

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-semibold text-navy">Employee schedule</h1>
      <p className="mt-2 text-sm text-muted">Publish shifts employees can see in their portal. Draft shifts remain internal.</p>
    </div>
    {canEdit ? <form action={createShift} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-2">
      <select name="employeeId" required className="rounded-lg border border-line px-3 py-2">
        <option value="">Select employee</option>
        {employees.map((e)=><option key={e.id} value={e.id}>{e.legalLastName}, {e.legalFirstName} · {e.employeeNumber}</option>)}
      </select>
      <select name="status" defaultValue="PUBLISHED" className="rounded-lg border border-line px-3 py-2">
        <option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option>
      </select>
      <input type="datetime-local" name="startsAt" required className="rounded-lg border border-line px-3 py-2" />
      <input type="datetime-local" name="endsAt" required className="rounded-lg border border-line px-3 py-2" />
      <input name="routeName" placeholder="Route / assignment" className="rounded-lg border border-line px-3 py-2" />
      <input name="location" placeholder="Location" className="rounded-lg border border-line px-3 py-2" />
      <textarea name="notes" placeholder="Notes" className="rounded-lg border border-line px-3 py-2 md:col-span-2" />
      <button className="w-fit rounded-full bg-navy px-4 py-2 font-semibold text-white">Save shift</button>
    </form> : null}
    <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted"><tr>
          <th className="px-4 py-3">Employee</th><th className="px-4 py-3">Starts</th><th className="px-4 py-3">Ends</th><th className="px-4 py-3">Assignment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
        </tr></thead>
        <tbody>{shifts.map((s)=><tr key={s.id} className="border-b border-line last:border-0">
          <td className="px-4 py-3">{s.employee.legalFirstName} {s.employee.legalLastName}</td>
          <td className="px-4 py-3">{s.startsAt.toLocaleString()}</td>
          <td className="px-4 py-3">{s.endsAt.toLocaleString()}</td>
          <td className="px-4 py-3">{s.routeName ?? s.location ?? "—"}</td>
          <td className="px-4 py-3">{s.status.replaceAll("_"," ")}</td>
          <td className="px-4 py-3">{canEdit ? <div className="flex flex-wrap gap-2">
            {s.status !== "PUBLISHED" ? <form action={setShiftStatus.bind(null,s.id,"PUBLISHED")}><button className="underline">Publish</button></form> : null}
            {s.status !== "CANCELLED" ? <form action={setShiftStatus.bind(null,s.id,"CANCELLED")}><button className="underline">Cancel</button></form> : null}
          </div> : "—"}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
