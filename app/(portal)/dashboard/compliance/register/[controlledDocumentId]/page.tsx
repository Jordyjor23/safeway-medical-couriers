import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  activateControlledDocumentAction,
  assignControlledDocumentAction,
} from "@/app/(portal)/dashboard/compliance/register/actions";
import {
  COMPANY_ACKNOWLEDGMENT_DISCLAIMER,
  COMPANY_ASSIGNMENT_ACTIONS,
  COMPANY_ASSIGNMENT_AUDIENCES,
} from "@/lib/compliance/library-catalog";
import { canManageCompanyLibrary, canViewCompanyLibraryAdmin } from "@/lib/compliance/library-access";
import { prisma } from "@/lib/db";
import { SYSTEM_ROLE_KEYS } from "@/lib/permissions";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = { title: "Controlled document" };

export default async function ControlledDocumentDetailPage({
  params,
}: {
  params: Promise<{ controlledDocumentId: string }>;
}) {
  const ctx = await requireAuth();
  if (!canViewCompanyLibraryAdmin(ctx.roles)) notFound();
  const { controlledDocumentId } = await params;
  const [row, employees, jobs, requirements] = await Promise.all([
    prisma.controlledDocument.findUnique({
      where: { id: controlledDocumentId },
      include: {
        parentCompanyDocument: true,
        sourceManagedDocument: true,
        assignments: { orderBy: { createdAt: "desc" } },
        acknowledgments: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
        implementationTasks: { orderBy: { title: "asc" } },
      },
    }),
    prisma.employee.findMany({ orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }] }),
    prisma.jobOpening.findMany({ orderBy: { title: "asc" } }),
    prisma.complianceRequirement.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!row) notFound();
  const canManage = canManageCompanyLibrary(ctx.roles);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/compliance/register" className="text-sm font-semibold text-medical hover:underline">
          ← Controlled register
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-navy">{row.controlledDocumentId}</h1>
        <p className="mt-1 text-lg text-navy">{row.title}</p>
        <p className="mt-1 text-sm text-muted">
          {row.documentType.replaceAll("_", " ")} · {row.category.replaceAll("_", " ")} · rev {row.revision} ·{" "}
          {row.status}
          {row.active ? "" : " · inactive"}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-muted">{row.description}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Owner role</dt>
            <dd>{row.ownerRole ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Approval authority</dt>
            <dd>{row.approvalAuthority ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Effective</dt>
            <dd>{row.effectiveDate?.toLocaleDateString() ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Review</dt>
            <dd>{row.reviewDate?.toLocaleDateString() ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Section / page</dt>
            <dd>{[row.sectionReference, row.pageReference].filter(Boolean).join(" · ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Parent source</dt>
            <dd>
              {row.parentCompanyDocument ? (
                <Link href={`/dashboard/compliance/library/${row.parentCompanyDocument.id}`} className="text-medical hover:underline">
                  {row.parentCompanyDocument.title} · rev {row.parentCompanyDocument.revision}
                </Link>
              ) : (
                "Awaiting master CompanyDocument"
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-3">
          {row.sourceManagedDocumentId ? (
            <Link
              href={`/api/portal/documents/${row.sourceManagedDocumentId}/file`}
              className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              Open shared master file
            </Link>
          ) : (
            <p className="text-sm text-muted">No ManagedDocument yet. Upload SC-MCM-001 on the library page.</p>
          )}
          {canManage && row.sourceManagedDocumentId && row.status !== "ACTIVE" ? (
            <form action={activateControlledDocumentAction}>
              <input type="hidden" name="controlledDocumentId" value={row.id} />
              <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy">
                Activate this record
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <form action={assignControlledDocumentAction} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
          <h2 className="font-semibold text-navy sm:col-span-2">Assign this controlled record</h2>
          <p className="text-sm text-muted sm:col-span-2">
            Employees assigned {row.controlledDocumentId} acknowledge this section, not the entire SC-MCM-001 manual.
            SIGN is a future e-sign action only.
          </p>
          <input type="hidden" name="controlledDocumentId" value={row.id} />
          <select name="action" className="rounded-lg border border-line px-3 py-2 text-sm">
            {COMPANY_ASSIGNMENT_ACTIONS.map((value) => (
              <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
            ))}
          </select>
          <select name="audience" className="rounded-lg border border-line px-3 py-2 text-sm">
            {COMPANY_ASSIGNMENT_AUDIENCES.map((value) => (
              <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
            ))}
          </select>
          <select name="roleKey" className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Role (if audience is Role)</option>
            {SYSTEM_ROLE_KEYS.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <select name="employeeId" className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Employee (if audience is Employee)</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.legalLastName}, {employee.legalFirstName}
              </option>
            ))}
          </select>
          <select name="jobOpeningId" className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Job (if audience is Job)</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title} ({job.status})</option>
            ))}
          </select>
          <select name="requirementId" className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Training / certificate requirement (optional)</option>
            {requirements.map((requirement) => (
              <option key={requirement.id} value={requirement.id}>{requirement.name}</option>
            ))}
          </select>
          <p className="text-xs text-muted sm:col-span-2">{COMPANY_ACKNOWLEDGMENT_DISCLAIMER}</p>
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Save assignment</button>
        </form>
      ) : null}

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Assignments</h2>
        {row.assignments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None yet. Unassigned sections stay hidden from employees.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {row.assignments.map((assignment) => (
              <li key={assignment.id}>
                {assignment.action} · {assignment.audience}
                {assignment.roleKey ? ` · ${assignment.roleKey}` : ""}
                {assignment.active ? "" : " · inactive"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Acknowledgments for this controlled revision</h2>
        {row.acknowledgments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No acknowledgments for this exact controlled ID and revision.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {row.acknowledgments.map((ack) => (
              <li key={ack.id}>
                {ack.user.name} · {ack.createdAt.toLocaleString()} · {ack.controlledDocumentKey} rev {ack.controlledDocumentRevision}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Linked implementation tasks</h2>
        {row.implementationTasks.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None linked to this record.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {row.implementationTasks.map((task) => (
              <li key={task.id}>
                {task.title} · {task.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
