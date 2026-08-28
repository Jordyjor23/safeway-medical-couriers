import type { Metadata } from "next";
import Link from "next/link";
import { createEmployee } from "@/app/(portal)/dashboard/employees/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Employees" };

const fieldClass = "rounded-lg border border-line px-3 py-2 text-sm";

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
      {canEdit ? (
        <form action={createEmployee} className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold text-navy sm:col-span-2">Add employee</h2>
          <input name="legalFirstName" required placeholder="First name" className={fieldClass} />
          <input name="legalLastName" required placeholder="Last name" className={fieldClass} />
          <input name="preferredName" placeholder="Preferred name" className={fieldClass} />
          <input name="email" type="email" required placeholder="Email" className={fieldClass} />
          <input name="phone" placeholder="Phone" className={fieldClass} />
          <input name="jobTitle" required placeholder="Job title" className={fieldClass} />
          <input name="department" placeholder="Department" className={fieldClass} />
          <select name="classification" className={fieldClass}>
            <option value="W2_EMPLOYEE">W-2 employee</option>
            <option value="INDEPENDENT_CONTRACTOR">Independent contractor</option>
          </select>
          <select name="status" className={fieldClass}>
            <option value="PENDING_ONBOARDING">Pending onboarding</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
          </select>
          <label className="text-sm">
            Hire date
            <input name="hireDate" type="date" className={`${fieldClass} mt-1 w-full`} />
          </label>
          <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:col-span-2 sm:w-fit">
            Create employee
          </button>
        </form>
      ) : null}
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
