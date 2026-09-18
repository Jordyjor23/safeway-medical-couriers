import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateShift } from "@/app/(portal)/dashboard/workforce/actions";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { formatBusinessDateTimeInput } from "@/lib/workforce-time";

export const metadata: Metadata = { title: "Edit shift" };

export default async function EditShiftPage({ params }: { params: Promise<{ shiftId: string }> }) {
  await requirePermission("scheduling.manage");
  const { shiftId } = await params;
  const [shift, employees] = await Promise.all([
    prisma.employeeShift.findUnique({ where: { id: shiftId }, include: { employee: true } }),
    prisma.employee.findMany({
      where: { status: { in: ["ACTIVE", "PENDING_ONBOARDING"] } },
      orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
    }),
  ]);
  if (!shift) notFound();
  const action = updateShift.bind(null, shift.id);
  return (
    <div>
      <Link href="/dashboard/workforce/schedule" className="text-sm font-semibold text-medical hover:underline">← Schedule</Link>
      <h1 className="mt-3 text-3xl font-semibold text-navy">Edit shift</h1>
      <p className="mt-2 text-sm text-muted">{shift.employee.legalFirstName} {shift.employee.legalLastName} · {shift.status}</p>
      <form action={action} className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-navy md:col-span-2">Employee
          <select name="employeeId" defaultValue={shift.employeeId} required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2">
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.legalFirstName} {employee.legalLastName} · {employee.jobTitle}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">Start
          <input name="startsAt" type="datetime-local" required defaultValue={formatBusinessDateTimeInput(shift.startsAt)} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-navy">End
          <input name="endsAt" type="datetime-local" required defaultValue={formatBusinessDateTimeInput(shift.endsAt)} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-navy">Assignment
          <input name="assignment" defaultValue={shift.assignment ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-navy">Location
          <input name="location" defaultValue={shift.location ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-navy">Break minutes
          <input name="breakMinutes" type="number" min="0" defaultValue={shift.breakMinutes} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-navy md:col-span-2">Notes
          <textarea name="notes" rows={3} defaultValue={shift.notes ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Save shift changes</button>
      </form>
    </div>
  );
}
