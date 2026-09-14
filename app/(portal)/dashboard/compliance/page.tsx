import type { Metadata } from "next";
import Link from "next/link";
import { upsertComplianceRecord } from "@/app/(portal)/dashboard/compliance/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Compliance tracking" };

const statuses = ["CURRENT", "EXPIRING_SOON", "EXPIRED", "MISSING", "NOT_REQUIRED"];

export default async function ComplianceDashboardPage() {
  const ctx = await requirePermission("compliance.view");
  const now = new Date();
  const [requirements, records, employees, library, register, tasks, matrix] = await Promise.all([
    prisma.complianceRequirement.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.complianceRecord.findMany({
      include: { employee: true, requirement: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.employee.findMany({
      orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
    }),
    prisma.companyDocument.findMany({
      include: {
        assignments: { where: { active: true } },
        acknowledgments: true,
        document: { select: { verificationStatus: true, expirationDate: true, lifecycleStatus: true } },
      },
    }),
    prisma.controlledDocument.findMany({ select: { id: true, status: true, active: true, sourceManagedDocumentId: true } }),
    prisma.complianceImplementationTask.findMany({ select: { id: true, status: true } }),
    prisma.serviceAuthorization.findMany({ select: { id: true, status: true, active: true } }),
  ]);
  const canEdit = hasPermission(ctx, "compliance.edit");
  const activeSops = library.filter((row) => row.publicationStatus === "ACTIVE" && (row.purpose === "SOP" || row.purpose === "POLICY"));
  const awaitingAck = library.filter((row) =>
    row.publicationStatus === "ACTIVE" &&
    row.assignments.some((assignment) => assignment.action === "READ_AND_ACKNOWLEDGE" || assignment.action === "SIGN"),
  );
  const dueForReview = library.filter((row) => row.reviewDate && row.reviewDate.getTime() <= now.getTime() && row.publicationStatus === "ACTIVE");
  const recentlySuperseded = library.filter((row) => row.publicationStatus === "SUPERSEDED");
  const pendingReviewDocs = await prisma.managedDocument.count({
    where: { verificationStatus: "UNVERIFIED", lifecycleStatus: { in: ["UPLOADED", "NEEDS_REVIEW"] } },
  });
  const expiringCerts = await prisma.managedDocument.count({
    where: {
      expirationDate: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), gte: now },
      lifecycleStatus: { notIn: ["ARCHIVED", "SUPERSEDED"] },
    },
  });
  const expiredCerts = await prisma.managedDocument.count({
    where: { expirationDate: { lt: now }, lifecycleStatus: { notIn: ["ARCHIVED", "SUPERSEDED"] } },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Compliance tracking</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        This is document and training tracking status, not a legal determination that a person is
        compliant.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard/compliance/library" className="font-semibold text-medical hover:underline">
          Company document library
        </Link>
        <Link href="/dashboard/compliance/register" className="font-semibold text-medical hover:underline">
          Controlled register
        </Link>
        <Link href="/dashboard/compliance/forms" className="font-semibold text-medical hover:underline">
          Forms register
        </Link>
        <Link href="/dashboard/compliance/tasks" className="font-semibold text-medical hover:underline">
          Implementation tasks
        </Link>
        <Link href="/dashboard/compliance/matrix" className="font-semibold text-medical hover:underline">
          Service authorization
        </Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Active SOPs / policies</p>
          <p className="mt-1 text-2xl font-semibold text-navy">{activeSops.length}</p>
        </article>
        <article className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Policies awaiting acknowledgment</p>
          <p className="mt-1 text-2xl font-semibold text-navy">{awaitingAck.length}</p>
        </article>
        <article className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Docs pending review</p>
          <p className="mt-1 text-2xl font-semibold text-navy">{pendingReviewDocs}</p>
        </article>
        <article className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Expiring / expired credentials</p>
          <p className="mt-1 text-2xl font-semibold text-navy">{expiringCerts} / {expiredCerts}</p>
        </article>
        <article className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Policies due for review</p>
          <p className="mt-1 text-2xl font-semibold text-navy">{dueForReview.length}</p>
        </article>
        <article className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Recently superseded</p>
          <p className="mt-1 text-2xl font-semibold text-navy">{recentlySuperseded.length}</p>
        </article>
        <article className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Controlled register pending source</p>
          <p className="mt-1 text-2xl font-semibold text-navy">
            {register.filter((row) => row.status === "PENDING_SOURCE" || !row.sourceManagedDocumentId).length}
          </p>
        </article>
        <article className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Open implementation tasks</p>
          <p className="mt-1 text-2xl font-semibold text-navy">{tasks.filter((row) => row.status === "OPEN").length}</p>
        </article>
        <article className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Inactive service matrix rows</p>
          <p className="mt-1 text-2xl font-semibold text-navy">{matrix.filter((row) => !row.active).length}</p>
        </article>
      </div>
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
