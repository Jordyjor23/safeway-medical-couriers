import { upsertPayrollRecord } from "@/app/(portal)/dashboard/workforce/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export default async function PayrollPage() {
  const ctx = await requirePermission("payroll.view");
  const canManage = hasPermission(ctx, "payroll.manage");
  const [employees, records] = await Promise.all([
    prisma.employee.findMany({ where: { status: { not: "TERMINATED" } }, orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }] }),
    prisma.payrollRecord.findMany({ include: { employee: true }, orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }], take: 250 }),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold text-navy">Payroll</h1><p className="mt-2 max-w-3xl text-sm text-muted">Internal payroll preparation and payment tracking. Tax filing, direct deposit, and statutory payroll processing still require your payroll provider.</p></div>
    {canManage ? <form action={upsertPayrollRecord} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-3">
      <select name="employeeId" required className="rounded-lg border border-line px-3 py-2"><option value="">Select employee</option>{employees.map(e=><option key={e.id} value={e.id}>{e.legalLastName}, {e.legalFirstName} · {e.employeeNumber}</option>)}</select>
      <input type="date" name="periodStart" required className="rounded-lg border border-line px-3 py-2" />
      <input type="date" name="periodEnd" required className="rounded-lg border border-line px-3 py-2" />
      <input type="number" min="0" step="0.01" name="regularHours" placeholder="Regular hours" className="rounded-lg border border-line px-3 py-2" />
      <input type="number" min="0" step="0.01" name="overtimeHours" placeholder="Overtime hours" className="rounded-lg border border-line px-3 py-2" />
      <input type="number" min="0" step="0.01" name="hourlyRate" placeholder="Hourly rate" className="rounded-lg border border-line px-3 py-2" />
      <input type="number" min="0" step="0.01" name="grossPay" placeholder="Gross pay (salary/manual)" className="rounded-lg border border-line px-3 py-2" />
      <input type="number" min="0" step="0.01" name="reimbursements" placeholder="Reimbursements" className="rounded-lg border border-line px-3 py-2" />
      <input type="number" min="0" step="0.01" name="deductions" placeholder="Deductions" className="rounded-lg border border-line px-3 py-2" />
      <select name="status" defaultValue="DRAFT" className="rounded-lg border border-line px-3 py-2"><option value="DRAFT">Draft</option><option value="REVIEW">Review</option><option value="APPROVED">Approved</option><option value="PAID">Paid</option></select>
      <input name="notes" placeholder="Notes / external payroll reference" className="rounded-lg border border-line px-3 py-2 md:col-span-2" />
      <button className="w-fit rounded-full bg-navy px-4 py-2 font-semibold text-white">Save payroll record</button>
    </form> : null}
    <div className="overflow-x-auto rounded-2xl border border-line bg-paper"><table className="min-w-full text-left text-sm">
      <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Gross</th><th className="px-4 py-3">Net</th><th className="px-4 py-3">Status</th></tr></thead>
      <tbody>{records.map(r=><tr key={r.id} className="border-b border-line last:border-0"><td className="px-4 py-3">{r.employee.legalFirstName} {r.employee.legalLastName}</td><td className="px-4 py-3">{r.periodStart.toLocaleDateString()} – {r.periodEnd.toLocaleDateString()}</td><td className="px-4 py-3">{Number(r.regularHours).toFixed(2)} / {Number(r.overtimeHours).toFixed(2)} OT</td><td className="px-4 py-3">${Number(r.grossPay).toFixed(2)}</td><td className="px-4 py-3">${Number(r.netPay).toFixed(2)}</td><td className="px-4 py-3">{r.status}</td></tr>)}</tbody>
    </table></div>
  </div>;
}
