import type { Metadata } from "next";
import Link from "next/link";
import { CreateEmployeeForm } from "@/components/portal/CreateEmployeeForm";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await requirePermission("employees.view");
  const params = await searchParams;
  const allowedStatuses = ["PENDING_ONBOARDING", "ACTIVE", "INACTIVE", "TERMINATED"] as const;
  const status = allowedStatuses.includes(params.status as (typeof allowedStatuses)[number])
    ? (params.status as (typeof allowedStatuses)[number])
    : undefined;
  const employees = await prisma.employee.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
  const canEdit = hasPermission(ctx, "employees.edit");

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Employees</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Add staff records here, or mark an applicant Hired to create an onboarding file.
      </p>
      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-line px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="PENDING_ONBOARDING">Pending onboarding</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="TERMINATED">Terminated</option>
        </select>
        <button className="rounded-full border border-navy px-4 py-2 text-sm font-semibold text-navy">Filter</button>
      </form>
      {canEdit ? <CreateEmployeeForm /> : null}
      {employees.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-paper px-4 py-8 text-sm text-muted">
          No employees yet.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 md:hidden">
            {employees.map((employee) => (
              <Link
                key={employee.id}
                href={`/dashboard/employees/${employee.id}`}
                className="block rounded-2xl border border-line bg-paper p-4 shadow-sm transition active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                      {employee.employeeNumber}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-navy">
                      {employee.legalFirstName} {employee.legalLastName}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{employee.jobTitle}</p>
                  </div>
                  <span className="rounded-full border border-line bg-ice px-3 py-1 text-xs font-semibold text-navy">
                    {employee.status.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-muted">Classification</p>
                    <p className="mt-1 text-navy">{employee.classification.replaceAll("_", " ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold uppercase tracking-wide text-muted">Profile</p>
                    <p className="mt-1 font-semibold text-medical">Open / Edit →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-line bg-paper md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{employee.employeeNumber}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/employees/${employee.id}`}
                        className="font-medium text-navy hover:text-medical"
                      >
                        {employee.legalFirstName} {employee.legalLastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{employee.jobTitle}</td>
                    <td className="px-4 py-3">{employee.classification.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">{employee.status.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/employees/${employee.id}`}
                        className="inline-flex rounded-full border border-navy px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy hover:text-white"
                      >
                        Open / Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
