import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { CreateEmployeeForm } from "@/components/portal/CreateEmployeeForm";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    classification?: string;
    worker?: string;
    page?: string;
  }>;
}) {
  const ctx = await requirePermission("employees.view");
  const params = await searchParams;
  const q = String(params.q ?? "").trim();

  const allowedStatuses = ["PENDING_ONBOARDING", "ACTIVE", "INACTIVE", "TERMINATED"] as const;
  const status = allowedStatuses.includes(params.status as (typeof allowedStatuses)[number])
    ? (params.status as (typeof allowedStatuses)[number])
    : undefined;

  const allowedClassifications = ["W2_EMPLOYEE", "INDEPENDENT_CONTRACTOR"] as const;
  const classification = allowedClassifications.includes(
    params.classification as (typeof allowedClassifications)[number],
  )
    ? (params.classification as (typeof allowedClassifications)[number])
    : undefined;

  const worker = params.worker === "DRIVER" || params.worker === "NON_DRIVER" ? params.worker : undefined;
  const requestedPage = Number.parseInt(String(params.page ?? "1"), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 50;

  const where: Prisma.EmployeeWhereInput = {
    ...(status ? { status } : {}),
    ...(classification ? { classification } : {}),
    ...(worker === "DRIVER" ? { isDriver: true } : worker === "NON_DRIVER" ? { isDriver: false } : {}),
    ...(q
      ? {
          OR: [
            { employeeNumber: { contains: q, mode: "insensitive" } },
            { legalFirstName: { contains: q, mode: "insensitive" } },
            { legalLastName: { contains: q, mode: "insensitive" } },
            { preferredName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { jobTitle: { contains: q, mode: "insensitive" } },
            { department: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canEdit = hasPermission(ctx, "employees.edit");

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status) query.set("status", status);
    if (classification) query.set("classification", classification);
    if (worker) query.set("worker", worker);
    query.set("page", String(nextPage));
    return `/dashboard/employees?${query.toString()}`;
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Employees</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Add staff records here, or mark an applicant Hired to create an onboarding file.
      </p>
      <form className="mt-5 rounded-2xl border border-line bg-paper p-4" method="get">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,2fr)_1fr_1fr_1fr_auto]">
          <label className="text-sm font-semibold text-navy">
            Search employees
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, employee ID, email, phone, title, department..."
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-navy">
            Status
            <select name="status" defaultValue={status ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm">
              <option value="">All statuses</option>
              <option value="PENDING_ONBOARDING">Pending onboarding</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-navy">
            Classification
            <select name="classification" defaultValue={classification ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm">
              <option value="">All classifications</option>
              <option value="W2_EMPLOYEE">W-2 employee</option>
              <option value="INDEPENDENT_CONTRACTOR">1099 contractor</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-navy">
            Worker type
            <select name="worker" defaultValue={worker ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm">
              <option value="">All workers</option>
              <option value="DRIVER">Courier / driver</option>
              <option value="NON_DRIVER">Non-driver</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white">
              Search
            </button>
            <Link href="/dashboard/employees" className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-navy">
              Clear
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
          <p>
            {total === 0
              ? "No matching employees"
              : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} matching employees`}
          </p>
          {q ? <p>Search: “{q}”</p> : null}
        </div>
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
          {totalPages > 1 ? (
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm text-muted">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy">
                    ← Previous
                  </Link>
                ) : null}
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} className="rounded-full border border-navy px-4 py-2 text-sm font-semibold text-navy">
                    Next →
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
