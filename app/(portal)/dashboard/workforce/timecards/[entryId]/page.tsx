import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTimeEntry } from "@/app/(portal)/dashboard/workforce/actions";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { formatBusinessDateTimeInput } from "@/lib/workforce-time";

export const metadata: Metadata = { title: "Edit timecard" };

export default async function EditTimecardPage({ params }: { params: Promise<{ entryId: string }> }) {
  await requirePermission("timecards.manage");
  const { entryId } = await params;
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId }, include: { employee: true } });
  if (!entry) notFound();
  const action = updateTimeEntry.bind(null, entry.id);
  return (
    <div>
      <Link href="/dashboard/workforce/timecards" className="text-sm font-semibold text-medical hover:underline">← Timecards</Link>
      <h1 className="mt-3 text-3xl font-semibold text-navy">Edit timecard</h1>
      <p className="mt-2 text-sm text-muted">{entry.employee.legalFirstName} {entry.employee.legalLastName} · current status {entry.status}</p>
      <p className="mt-2 text-xs text-muted">Any correction resets approval and returns the timecard to Submitted (or Open when there is no clock-out).</p>
      <form action={action} className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-navy">Clock in
          <input name="clockIn" type="datetime-local" required defaultValue={formatBusinessDateTimeInput(entry.clockIn)} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-navy">Clock out
          <input name="clockOut" type="datetime-local" defaultValue={formatBusinessDateTimeInput(entry.clockOut)} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-navy">Break minutes
          <input name="breakMinutes" type="number" min="0" defaultValue={entry.breakMinutes} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-navy md:col-span-2">Manager note
          <textarea name="managerNote" rows={3} defaultValue={entry.managerNote ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Save timecard correction</button>
      </form>
    </div>
  );
}
