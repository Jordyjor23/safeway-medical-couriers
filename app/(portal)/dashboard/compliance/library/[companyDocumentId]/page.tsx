import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveCompanyDocumentAction,
  assignCompanyDocumentAction,
  publishCompanyDocumentAction,
  uploadCompanyLibraryAction,
} from "@/app/(portal)/dashboard/compliance/library/actions";
import {
  COMPANY_ACKNOWLEDGMENT_DISCLAIMER,
  COMPANY_ASSIGNMENT_ACTIONS,
  COMPANY_ASSIGNMENT_AUDIENCES,
} from "@/lib/compliance/library-catalog";
import { canManageCompanyLibrary, canViewCompanyLibraryAdmin } from "@/lib/compliance/library-access";
import { prisma } from "@/lib/db";
import { SYSTEM_ROLE_KEYS } from "@/lib/permissions";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = { title: "Company document" };

export default async function CompanyDocumentDetailPage({
  params,
}: {
  params: Promise<{ companyDocumentId: string }>;
}) {
  const ctx = await requireAuth();
  if (!canViewCompanyLibraryAdmin(ctx.roles)) notFound();
  const { companyDocumentId } = await params;
  const [row, employees, jobs, requirements] = await Promise.all([
    prisma.companyDocument.findUnique({
      where: { id: companyDocumentId },
      include: {
        document: true,
        assignments: { orderBy: { createdAt: "desc" } },
        acknowledgments: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.employee.findMany({ orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }] }),
    prisma.jobOpening.findMany({ orderBy: { title: "asc" } }),
    prisma.complianceRequirement.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!row) notFound();
  const versions = await prisma.companyDocument.findMany({
    where: { familyKey: row.familyKey },
    orderBy: { createdAt: "desc" },
  });
  const canManage = canManageCompanyLibrary(ctx.roles);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/compliance/library" className="text-sm font-semibold text-medical hover:underline">
          ← Compliance library
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-navy">{row.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {row.purpose.replaceAll("_", " ")} · {row.libraryCategory.replaceAll("_", " ")} · revision {row.revision} ·{" "}
          {row.publicationStatus}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-muted">{row.description || "No description provided."}</p>
        <p className="mt-2 text-xs text-muted">
          SHA-256 {row.document.contentSha256 ?? "n/a"} · uploaded {row.document.uploadedAt.toLocaleString()}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/api/portal/documents/${row.documentId}/file`}
            className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            Open private file
          </Link>
          {canManage && row.publicationStatus === "DRAFT" ? (
            <form action={publishCompanyDocumentAction}>
              <input type="hidden" name="companyDocumentId" value={row.id} />
              <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy">Activate</button>
            </form>
          ) : null}
          {canManage && row.publicationStatus !== "ARCHIVED" ? (
            <form action={archiveCompanyDocumentAction}>
              <input type="hidden" name="companyDocumentId" value={row.id} />
              <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy">Archive</button>
            </form>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Version history</h2>
        <p className="mt-1 text-sm text-muted">Prior versions stay immutable. Acknowledgments stay on the exact revision.</p>
        <ul className="mt-3 space-y-2 text-sm">
          {versions.map((version) => (
            <li key={version.id}>
              <Link href={`/dashboard/compliance/library/${version.id}`} className="font-medium text-navy hover:text-medical">
                {version.revision} · {version.publicationStatus}
              </Link>
            </li>
          ))}
        </ul>
        {canManage ? (
          <form action={uploadCompanyLibraryAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="supersedesId" value={row.id} />
            <input type="hidden" name="familyKey" value={row.familyKey} />
            <input type="hidden" name="title" value={row.title} />
            <input type="hidden" name="purpose" value={row.purpose} />
            <input type="hidden" name="libraryCategory" value={row.libraryCategory} />
            <input type="hidden" name="documentNumber" value={row.documentNumber ?? ""} />
            <p className="text-sm text-muted sm:col-span-2">Replace with a new file to create the next revision.</p>
            <input name="file" type="file" required className="text-sm sm:col-span-2" />
            <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Upload new version</button>
          </form>
        ) : null}
      </section>

      {canManage ? (
        <form action={assignCompanyDocumentAction} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
          <h2 className="font-semibold text-navy sm:col-span-2">Assign</h2>
          <input type="hidden" name="familyKey" value={row.familyKey} />
          <input type="hidden" name="companyDocumentId" value={row.id} />
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
            <option value="">Certificate requirement (optional)</option>
            {requirements.map((requirement) => (
              <option key={requirement.id} value={requirement.id}>{requirement.name}</option>
            ))}
          </select>
          <p className="text-xs text-muted sm:col-span-2">{COMPANY_ACKNOWLEDGMENT_DISCLAIMER} SIGN is stored as a future action only.</p>
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Save assignment</button>
        </form>
      ) : null}

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Current assignments</h2>
        {row.assignments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None yet. Unassigned internal documents stay hidden from employees and applicants.</p>
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
        <h2 className="font-semibold text-navy">Acknowledgments for this revision</h2>
        {row.acknowledgments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No acknowledgments recorded for this exact version.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {row.acknowledgments.map((ack) => (
              <li key={ack.id}>
                {ack.user.name} · {ack.createdAt.toLocaleString()} · rev {ack.documentRevision}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
