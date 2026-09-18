import { clockIn, clockOut } from "@/app/(employee)/employee/actions";
import { prisma } from "@/lib/db";
import { requirePortal } from "@/lib/rbac";
import { formatBusinessDateTime, hoursBetween } from "@/lib/workforce-time";

export default async function MyTimecardsPage() {
  const ctx = await requirePortal("employee");
  const employeeId = ctx.user.employeeId;
  if (!employeeId) return <p className="text-muted">No employee profile is linked.</p>;
  const now = new Date();
  const [openEntry, entries, upcomingShifts] = await Promise.all([
    prisma.timeEntry.findFirst({ where: { employeeId, clockOut: null, status: "OPEN" }, orderBy: { clockIn: "desc" } }),
    prisma.timeEntry.findMany({ where: { employeeId }, orderBy: { clockIn: "desc" }, take: 50 }),
    prisma.employeeShift.findMany({ where: { employeeId, status: "PUBLISHED", startsAt: { gte: new Date(now.getTime() - 6 * 3_600_000) } }, orderBy: { startsAt: "asc" }, take: 20 }),
  ]);
  return <div><h1 className="text-3xl font-semibold text-navy">My timecards</h1>
    <section className="mt-6 rounded-2xl border border-line bg-paper p-5">{openEntry?<><p className="font-semibold text-navy">Clocked in {formatBusinessDateTime(openEntry.clockIn)}</p><form action={clockOut.bind(null,openEntry.id)} className="mt-4 grid gap-3 sm:grid-cols-2"><input name="breakMinutes" type="number" min="0" defaultValue="0" placeholder="Break minutes" className="rounded-lg border border-line px-3 py-2 text-sm" /><input name="employeeNote" placeholder="Note (optional)" className="rounded-lg border border-line px-3 py-2 text-sm" /><button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Clock out & submit</button></form></>:<form action={clockIn} className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><h2 className="font-semibold text-navy">Start timecard</h2><p className="text-sm text-muted">Choose a scheduled shift when applicable.</p></div><select name="shiftId" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2"><option value="">No specific shift</option>{upcomingShifts.map(s=><option key={s.id} value={s.id}>{formatBusinessDateTime(s.startsAt)} · {s.assignment ?? "Shift"}</option>)}</select><button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Clock in now</button></form>}</section>
    <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper"><table className="min-w-full text-left text-sm"><thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{entries.length===0?<tr><td colSpan={4} className="px-4 py-8 text-muted">No timecards yet.</td></tr>:entries.map(e=><tr key={e.id} className="border-b border-line last:border-0"><td className="px-4 py-3">{formatBusinessDateTime(e.clockIn)}</td><td className="px-4 py-3">{formatBusinessDateTime(e.clockOut)}</td><td className="px-4 py-3">{e.clockOut?hoursBetween(e.clockIn,e.clockOut,e.breakMinutes).toFixed(2):"Open"}</td><td className="px-4 py-3">{e.status}</td></tr>)}</tbody></table></div>
  </div>;
}
