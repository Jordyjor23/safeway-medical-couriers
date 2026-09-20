import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatBusinessDate } from "@/lib/workforce-time";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Compliance matrix" };

function statusClass(status: string) {
  if (status === "CURRENT") return "bg-green-50 text-green-800";
  if (status === "EXPIRING_SOON") return "bg-amber-50 text-amber-900";
  if (status === "EXPIRED" || status === "MISSING") return "bg-red-50 text-red-800";
  return "bg-ice text-muted";
}

export default async function ComplianceMatrixPage() {
  await requirePermission("compliance.view");
  const [requirements, employees, records] = await Promise.all([
    prisma.complianceRequirement.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.employee.findMany({
      where: { status: { not: "TERMINATED" } },
      orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
      select: { id: true, legalFirstName: true, legalLastName: true, employeeNumber: true, status: true },
    }),
    prisma.complianceRecord.findMany(),
  ]);

  const byKey = new Map(records.map((record) => [`${record.employeeId}:${record.requirementId}`, record]));

  return (
    <div>
      <Link href="/dashboard/compliance" className="text-sm font-semibold text-medical hover:underline">
        ← Compliance tracking
      </Link>
      <h1 className="mt-3 text-3xl font-semibold text-navy">Compliance matrix</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Employee-by-requirement tracking view. This reports recorded status only and is not a legal compliance determination.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-max text-left text-sm">
          <thead className="sticky top-0 border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="sticky left-0 z-10 min-w-56 bg-ice px-4 py-3">Employee</th>
              {requirements.map((requirement) => (
                <th key={requirement.id} className="min-w-44 px-3 py-3">{requirement.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={requirements.length + 1}>
                  No active workforce records yet.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.id} className="border-b border-line last:border-0">
                  <td className="sticky left-0 z-10 bg-paper px-4 py-3">
                    <Link
                      href={`/dashboard/employees/${employee.id}`}
                      className="font-semibold text-navy hover:text-medical"
                    >
                      {employee.legalFirstName} {employee.legalLastName}
                    </Link>
                    <p className="text-xs text-muted">{employee.employeeNumber} · {employee.status.replaceAll("_", " ")}</p>
                  </td>
                  {requirements.map((requirement) => {
                    const record = byKey.get(`${employee.id}:${requirement.id}`);
                    const status = record?.status ?? "MISSING";
                    return (
                      <td key={requirement.id} className="px-3 py-3 align-top">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(status)}`}>
                          {status.replaceAll("_", " ")}
                        </span>
                        {record?.expiresAt ? (
                          <p className="mt-1 text-xs text-muted">Expires {formatBusinessDate(record.expiresAt)}</p>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
