import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePortal } from "@/lib/rbac";
import { formatBusinessDateTime } from "@/lib/workforce-time";

export default async function EmployeeDashboardPage() {
  const ctx = await requirePortal("employee");
  const employeeId = ctx.user.employeeId;
  if (!employeeId) return <div><h1 className="text-3xl font-semibold text-navy">Employee portal</h1><p className="mt-3 text-muted">Your login is active, but it is not linked to an employee profile yet. Contact an administrator.</p></div>;
  const now = new Date();
  const [employee, nextShift, openEntry, pendingTimeOff] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.employeeShift.findFirst({ where: { employeeId, status: "PUBLISHED", startsAt: { gte: now } }, orderBy: { startsAt: "asc" } }),
    prisma.timeEntry.findFirst({ where: { employeeId, clockOut: null, status: "OPEN" }, orderBy: { clockIn: "desc" } }),
    prisma.timeOffRequest.count({ where: { employeeId, status: "PENDING" } }),
  ]);
  if (!employee) return null;
  return <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Employee self-service</p><h1 className="mt-2 text-3xl font-semibold text-navy">Hi, {employee.preferredName || employee.legalFirstName}</h1><p className="mt-2 text-muted">{employee.jobTitle} · {employee.employeeNumber}</p>
    <div className="mt-7 grid gap-4 md:grid-cols-3"><Link href="/employee/schedule" className="rounded-2xl border border-line bg-paper p-5"><p className="text-sm font-semibold text-muted">Next shift</p><p className="mt-2 font-semibold text-navy">{nextShift ? formatBusinessDateTime(nextShift.startsAt) : "No published shift"}</p></Link><Link href="/employee/timecards" className="rounded-2xl border border-line bg-paper p-5"><p className="text-sm font-semibold text-muted">Timecard</p><p className="mt-2 font-semibold text-navy">{openEntry ? "Clocked in" : "Not clocked in"}</p></Link><Link href="/employee/time-off" className="rounded-2xl border border-line bg-paper p-5"><p className="text-sm font-semibold text-muted">Pending PTO / leave</p><p className="mt-2 text-2xl font-semibold text-navy">{pendingTimeOff}</p></Link></div>
  </div>;
}
