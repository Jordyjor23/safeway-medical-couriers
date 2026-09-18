import type { Metadata } from "next";
import Link from "next/link";
import { createManualTimeEntry, setTimeEntryStatus } from "@/app/(portal)/dashboard/workforce/actions";
import { prisma } from "@/lib/db";
import { currentInstant, formatBusinessDateTime, hoursBetween } from "@/lib/workforce-time";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Timecards" };

export default async function TimecardsPage() {
  const ctx = await requirePermission("timecards.view");
  const canManage = hasPermission(ctx, "timecards.manage");
  const now = currentInstant();
  const since = new Date(now.getTime() - 45 * 86_400_000);
  const [employees, entries] = await Promise.all([
    prisma.employee.findMany({ where: { status: { in: ["ACTIVE", "PENDING_ONBOARDING"] } }, orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }] }),
    prisma.timeEntry.findMany({ where: { clockIn: { gte: since } }, include: { employee: true }, orderBy: { clockIn: "desc" }, take: 250 }),
  ]);

  return (
    <div>
      <Link href="/dashboard/workforce" className="text-sm font-semibold text-medical hover:underline">← Workforce</Link>
      <h1 className="mt-3 text-3xl font-semibold text-navy">Timecards</h1>
      <p className="mt-2 text-sm text-muted">Review submitted hours, open punches, breaks and approval status.</p>
      {canManage ? (
        <form action={createManualTimeEntry} className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-2">
          <h2 className="text-lg font-semibold text-navy md:col-span-2">Add / correct a time entry</h2>
          <select name="employeeId" required className="rounded-lg border border-line px-3 py-2 text-sm"><option value="">Employee</option>{employees.map((employee)=><option key={employee.id} value={employee.id}>{employee.legalFirstName} {employee.legalLastName}</option>)}</select>
          <input name="breakMinutes" type="number" min="0" defaultValue="0" placeholder="Break minutes" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <label className="text-sm">Clock in<input name="clockIn" type="datetime-local" required className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
          <label className="text-sm">Clock out<input name="clockOut" type="datetime-local" className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
          <input name="managerNote" placeholder="Manager note" className="rounded-lg border border-line px-3 py-2 text-sm md:col-span-2" />
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Save time entry</button>
        </form>
      ) : null}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm"><thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Clock in</th><th className="px-4 py-3">Clock out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th>{canManage ? <th className="px-4 py-3">Review</th> : null}</tr></thead>
        <tbody>{entries.length===0?<tr><td colSpan={canManage?6:5} className="px-4 py-8 text-muted">No time entries in the last 45 days.</td></tr>:entries.map((entry)=>(
          <tr key={entry.id} className="border-b border-line last:border-0">
            <td className="px-4 py-3 font-medium text-navy">{entry.employee.legalFirstName} {entry.employee.legalLastName}</td>
            <td className="px-4 py-3">{formatBusinessDateTime(entry.clockIn)}</td><td className="px-4 py-3">{formatBusinessDateTime(entry.clockOut)}</td>
            <td className="px-4 py-3">{entry.clockOut ? hoursBetween(entry.clockIn, entry.clockOut, entry.breakMinutes).toFixed(2) : "Open"}</td><td className="px-4 py-3">{entry.status}</td>
            {canManage?<td className="px-4 py-3"><div className="flex gap-2"><Link href={`/dashboard/workforce/timecards/${entry.id}`} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">Edit</Link>{entry.status!=="APPROVED" && entry.clockOut ? <form action={setTimeEntryStatus.bind(null, entry.id, "APPROVED")}><button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">Approve</button></form>:null}{entry.status!=="REJECTED"?<form action={setTimeEntryStatus.bind(null, entry.id, "REJECTED")}><button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">Reject</button></form>:null}</div></td>:null}
          </tr>
        ))}</tbody></table>
      </div>
    </div>
  );
}
