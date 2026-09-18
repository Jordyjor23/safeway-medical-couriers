import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requirePortal } from "@/lib/rbac";
import { formatBusinessDate } from "@/lib/workforce-time";

export const metadata: Metadata = { title: "My pay" };

function money(value: { toString(): string } | number) {
  const amount = Number(value.toString());
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(amount) ? amount : 0,
  );
}

export default async function EmployeePayPage() {
  const ctx = await requirePortal("employee");
  const employeeId = ctx.user.employeeId;
  if (!employeeId) return <p className="text-muted">No employee profile is linked.</p>;

  const entries = await prisma.payrollEntry.findMany({
    where: {
      employeeId,
      OR: [
        { status: { in: ["APPROVED", "PAID"] } },
        { payrollPeriod: { status: { in: ["FINALIZED", "PAID"] } } },
      ],
    },
    include: { payrollPeriod: true },
    orderBy: { payrollPeriod: { payDate: "desc" } },
    take: 36,
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">My pay</h1>
      <p className="mt-2 text-sm text-muted">
        Your Safeway payroll history. This portal shows internal payroll records and does not replace a provider-issued pay stub or tax form.
      </p>

      {entries.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line bg-paper px-5 py-10 text-sm text-muted">
          No finalized or approved payroll records are available yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Pay period</th>
                <th className="px-4 py-3">Pay date</th>
                <th className="px-4 py-3">Regular</th>
                <th className="px-4 py-3">Overtime</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Reimbursements</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-navy">{entry.payrollPeriod.label}</td>
                  <td className="px-4 py-3">{formatBusinessDate(entry.payrollPeriod.payDate)}</td>
                  <td className="px-4 py-3">{entry.regularHours.toString()} hrs</td>
                  <td className="px-4 py-3">{entry.overtimeHours.toString()} hrs</td>
                  <td className="px-4 py-3">{money(entry.grossPay)}</td>
                  <td className="px-4 py-3">{money(entry.deductions)}</td>
                  <td className="px-4 py-3">{money(entry.reimbursements)}</td>
                  <td className="px-4 py-3 font-semibold text-navy">{money(entry.netPay)}</td>
                  <td className="px-4 py-3">{entry.status.replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
