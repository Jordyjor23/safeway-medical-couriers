import type { Metadata } from "next";
import Link from "next/link";
import { CreateEmployeeForm } from "@/components/portal/CreateEmployeeForm";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const ctx = await requirePermission("employees.view");
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: "desc" } });
  const canEdit = hasPermission(ctx, "employees.edit");

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Employees</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Add staff records here, or mark an applicant Hired to create an onboarding file.
      </p>
      {canEdit ? <CreateEmployeeForm /> : null}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Classification</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={5}>
                  No employees yet.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
