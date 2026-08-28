import type { Metadata } from "next";
import Link from "next/link";
import { upsertComplianceRecord } from "@/app/(portal)/dashboard/compliance/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Compliance tracking" };

const statuses = ["CURRENT", "EXPIRING_SOON", "EXPIRED", "MISSING", "NOT_REQUIRED"];

export default async function ComplianceDashboardPage() {
  const ctx = await requirePermission("compliance.view");
  const [requirements, records, employees] = await Promise.all([
    prisma.complianceRequirement.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.complianceRecord.findMany({
      include: { employee: true, requirement: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.employee.findMany({
      orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
    }),
  ]);
  const canEdit = hasPermission(ctx, "compliance.edit");

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Compliance tracking</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        This is document and training tracking status, not a legal determination that a person is
        compliant.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {requirements.map((requirement) => {
          const related = records.filter((record) => record.requirementId === requirement.id);
          const expired = related.filter(
            (record) => record.status === "EXPIRED" || record.status === "MISSING",
          ).length;
          return (
            <article key={requirement.id} className="rounded-2xl border border-line bg-paper p-5">
              <h2 className="font-semibold text-navy">{requirement.name}</h2>
              <p className="mt-2 text-sm text-muted">
                {related.length} records · {expired} expired or missing
              </p>
            </article>
          );
        })}
      </div>

      {canEdit ? (
        <form action={upsertComplianceRecord} className="mt-8 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold text-navy sm:col-span-2">Add or update a record</h2>
          <select name="employeeId" required className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.legalLastName}, {employee.legalFirstName}
              </option>
            ))}
          </select>
          <select name="requirementId" required className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Requirement</option>
            {requirements.map((requirement) => (
              <option key={requirement.id} value={requirement.id}>
                {requirement.name}
              </option>
            ))}
          </select>
          <select name="status" className="rounded-lg border border-line px-3 py-2 text-sm">
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <input name="notes" placeholder="Notes" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <label className="text-sm">
            Completed
            <input name="completedAt" type="date" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            Expires
            <input name="expiresAt" type="date" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
          </label>
          <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:col-span-2 sm:w-fit">
            Save record
          </button>
        </form>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Requirement</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expires</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={4}>
                  No compliance records yet.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/employees/${record.employeeId}`}
                      className="font-medium text-navy hover:text-medical"
                    >
                      {record.employee.legalFirstName} {record.employee.legalLastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{record.requirement.name}</td>
                  <td className="px-4 py-3">{record.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{record.expiresAt?.toLocaleDateString() ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
