import { clockIn, clockOut, submitLeaveRequest } from "@/app/(portal)/dashboard/workforce/actions";
import { prisma } from "@/lib/db";
import { requirePortal } from "@/lib/rbac";

export default async function EmployeeWorkforcePage() {
  const ctx = await requirePortal("employee");
  const employeeId = ctx.user.employeeId;
  if (!employeeId) {
    return <div><h1 className="text-3xl font-semibold text-navy">Schedule & time</h1><p className="mt-3 text-sm text-muted">No employee profile is linked to this login yet.</p></div>;
  }
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 14);
  const end = new Date(now);
  end.setDate(end.getDate() + 45);

  const [shifts, entries, leave, payroll, openEntry] = await Promise.all([
    prisma.workShift.findMany({
      where: { employeeId, status: { in: ["PUBLISHED", "COMPLETED", "CALLED_OFF"] }, startsAt: { gte: start, lte: end } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.timeEntry.findMany({ where: { employeeId }, orderBy: { workDate: "desc" }, take: 30 }),
    prisma.leaveRequest.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.payrollRecord.findMany({ where: { employeeId, status: { in: ["APPROVED", "PAID"] } }, orderBy: { periodEnd: "desc" }, take: 12 }),
    prisma.timeEntry.findFirst({ where: { employeeId, status: "OPEN", clockOut: null }, orderBy: { createdAt: "desc" } }),
  ]);

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold text-navy">Schedule & time</h1><p className="mt-2 text-sm text-muted">Your published schedule, timecards, PTO/call-offs, and approved payroll history.</p></div>

    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-semibold text-navy">Clock</h2>
      <p className="mt-1 text-sm text-muted">{openEntry?.clockIn ? `Clocked in since ${openEntry.clockIn.toLocaleString()}` : "You are currently clocked out."}</p>
      <div className="mt-3 flex gap-2">
        {openEntry ? <form action={clockOut}><button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Clock out</button></form> : <form action={clockIn}><button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Clock in</button></form>}
      </div>
    </section>

    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-semibold text-navy">My schedule</h2>
      {shifts.length ? <div className="mt-3 grid gap-3">{shifts.map(s=><div key={s.id} className="rounded-xl border border-line p-3 text-sm"><div className="font-medium text-navy">{s.startsAt.toLocaleString()} – {s.endsAt.toLocaleString()}</div><div className="mt-1 text-muted">{s.routeName ?? "Shift"}{s.location ? ` · ${s.location}` : ""} · {s.status.replaceAll("_"," ")}</div>{s.notes ? <p className="mt-1">{s.notes}</p> : null}</div>)}</div> : <p className="mt-2 text-sm text-muted">No published shifts in this window.</p>}
    </section>

    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-semibold text-navy">Request PTO / report call-off</h2>
      <form action={submitLeaveRequest} className="mt-3 grid gap-3 md:grid-cols-2">
        <select name="type" defaultValue="PTO" className="rounded-lg border border-line px-3 py-2"><option value="PTO">PTO</option><option value="SICK">Sick / call-off</option><option value="UNPAID">Unpaid time off</option><option value="BEREAVEMENT">Bereavement</option><option value="JURY_DUTY">Jury duty</option><option value="OTHER">Other</option></select>
        <input type="number" min="0" step="0.25" name="hours" placeholder="Hours (optional)" className="rounded-lg border border-line px-3 py-2" />
        <input type="date" name="startsOn" required className="rounded-lg border border-line px-3 py-2" />
        <input type="date" name="endsOn" required className="rounded-lg border border-line px-3 py-2" />
        <textarea name="reason" placeholder="Reason / call-off details" className="rounded-lg border border-line px-3 py-2 md:col-span-2" />
        <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Submit request</button>
      </form>
      {leave.length ? <ul className="mt-5 space-y-2 text-sm">{leave.map(r=><li key={r.id}>{r.type.replaceAll("_"," ")} · {r.startsOn.toLocaleDateString()} – {r.endsOn.toLocaleDateString()} · <strong>{r.status}</strong></li>)}</ul> : null}
    </section>

    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-semibold text-navy">My timecards</h2>
      {entries.length ? <div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-xs uppercase text-muted"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">In</th><th className="py-2 pr-4">Out</th><th className="py-2 pr-4">Hours</th><th className="py-2">Status</th></tr></thead><tbody>{entries.map(e=><tr key={e.id} className="border-t border-line"><td className="py-2 pr-4">{e.workDate.toLocaleDateString()}</td><td className="py-2 pr-4">{e.clockIn?.toLocaleTimeString() ?? "—"}</td><td className="py-2 pr-4">{e.clockOut?.toLocaleTimeString() ?? "—"}</td><td className="py-2 pr-4">{Number(e.regularHours).toFixed(2)}</td><td className="py-2">{e.status}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-muted">No timecards yet.</p>}
    </section>

    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-semibold text-navy">Payroll history</h2>
      <p className="mt-1 text-xs text-muted">Shows approved/paid internal payroll records only. Official pay statements come from the payroll provider.</p>
      {payroll.length ? <ul className="mt-3 space-y-2 text-sm">{payroll.map(p=><li key={p.id}>{p.periodStart.toLocaleDateString()} – {p.periodEnd.toLocaleDateString()} · gross ${Number(p.grossPay).toFixed(2)} · net ${Number(p.netPay).toFixed(2)} · {p.status}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No approved payroll records yet.</p>}
    </section>
  </div>;
}
