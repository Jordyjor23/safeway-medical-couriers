import Link from "next/link";
import { createIncident } from "@/app/(portal)/deliveries/actions";
import { DocumentUploader } from "@/components/portal/DocumentUploader";
import { EntityDocumentsSection } from "@/components/portal/EntityDocumentsSection";
import { listAssignedCompanyDocuments } from "@/lib/compliance/library";
import { employeeDocumentBuckets, missingRequirementLabels } from "@/lib/documents/buckets";
import { documentReviewState } from "@/lib/documents/review-status";
import { DOCUMENT_LIST_INCLUDE, documentLibraryWhere } from "@/lib/documents/query";
import { prisma } from "@/lib/db";
import { assertSameEmployee, hasPermission, requirePortal } from "@/lib/rbac";

export default async function EmployeeDashboardPage() {
  const ctx = await requirePortal("employee");
  const employee = ctx.user.employeeId
    ? await prisma.employee.findUnique({
        where: { id: ctx.user.employeeId },
        include: {
          trainings: true,
          tasks: { orderBy: { createdAt: "desc" } },
          manager: true,
        },
      })
    : null;
  if (employee) assertSameEmployee(ctx, employee.id);
  const documents =
    employee && hasPermission(ctx, "documents.view")
      ? await prisma.managedDocument.findMany({
          where: documentLibraryWhere(ctx, { employeeId: employee.id, archived: "all" }),
          include: DOCUMENT_LIST_INCLUDE,
          orderBy: { createdAt: "desc" },
        })
      : [];
  const rules = hasPermission(ctx, "documents.view")
    ? await prisma.documentRequirementRule.findMany({ include: { requirement: true } })
    : [];
  const records = employee
    ? await prisma.complianceRecord.findMany({
        where: { employeeId: employee.id },
        include: { requirement: true },
      })
    : [];
  const buckets = employeeDocumentBuckets(documents);
  const missing = missingRequirementLabels({ rules, records, documents });
  const incidents = await prisma.incidentReport.findMany({
    where: { reporterUserId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const companyDocuments = hasPermission(ctx, "documents.view")
    ? await listAssignedCompanyDocuments(ctx)
    : [];
  const companyPending = companyDocuments.filter((row) => row.canAcknowledge && row.acknowledgments.length === 0);
  const companyCompleted = companyDocuments.filter((row) => row.acknowledgments.length > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-navy">My portal</h1>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My profile</h2>
        {employee ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Name</dt><dd>{employee.legalFirstName} {employee.legalLastName}</dd></div>
            <div><dt className="text-muted">Employee ID</dt><dd>{employee.employeeNumber}</dd></div>
            <div><dt className="text-muted">Title</dt><dd>{employee.jobTitle}</dd></div>
            <div><dt className="text-muted">Department</dt><dd>{employee.department ?? "—"}</dd></div>
            <div><dt className="text-muted">Manager</dt><dd>{employee.manager ? `${employee.manager.legalFirstName} ${employee.manager.legalLastName}` : "—"}</dd></div>
            <div><dt className="text-muted">Email</dt><dd>{employee.email}</dd></div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted">No employee profile is linked to this login yet.</p>
        )}
      </section>
      {hasPermission(ctx, "documents.view") ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-semibold text-navy">My company documents</h2>
          <p className="mt-1 text-sm text-muted">
            Assigned SOPs, policies, training material, and acknowledgments. These are not your personal credentials.
          </p>
          {companyDocuments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No company documents are assigned to you.</p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-navy">Required / pending acknowledgment</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {companyPending.length ? companyPending.map((row) => (
                    <li key={row.id}>
                      <Link href={`/employee/company-documents/${row.id}`} className="font-medium text-medical hover:underline">
                        {row.title} · rev {row.revision}
                      </Link>
                    </li>
                  )) : <li className="text-muted">None pending.</li>}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy">Completed acknowledgments</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {companyCompleted.length ? companyCompleted.map((row) => (
                    <li key={row.id}>
                      <Link href={`/employee/company-documents/${row.id}`} className="font-medium text-navy hover:underline">
                        {row.title} · rev {row.acknowledgments[0]?.documentRevision}
                      </Link>
                    </li>
                  )) : <li className="text-muted">None yet.</li>}
                </ul>
              </div>
            </div>
          )}
        </section>
      ) : null}
      {hasPermission(ctx, "documents.view") ? (
        <EntityDocumentsSection
          title="My credentials"
          documents={documents}
          canDownload={hasPermission(ctx, "documents.download")}
          canUpload={hasPermission(ctx, "documents.upload")}
          canOpenDetails={false}
          missing={missing}
          sections={[
            { label: "Required / missing", documents: [], empty: missing.length ? undefined : "No missing requirements." },
            { label: "Uploaded / pending review", documents: documents.filter((doc) => ["UPLOADED", "PENDING_REVIEW"].includes(documentReviewState(doc))), empty: "None pending." },
            { label: "Approved", documents: documents.filter((doc) => documentReviewState(doc) === "APPROVED"), empty: "None approved yet." },
            { label: "Rejected", documents: buckets.rejected, empty: "None." },
            { label: "Expiring soon", documents: buckets.expiringSoon, empty: "None." },
            { label: "Expired", documents: buckets.expired, empty: "None." },
          ]}
          emptyBody="No assigned handbook, policy, or other files yet."
        >
          {employee && hasPermission(ctx, "documents.upload") ? (
            <DocumentUploader
              associations={{ employee: false, customer: false, contract: false, delivery: false }}
              preset={{
                employeeId: employee.id,
                employeeLabel: `${employee.legalFirstName} ${employee.legalLastName}`,
                category: "HR",
              }}
              triggerLabel="Upload compliance document"
              redirectOnSuccess={false}
            />
          ) : null}
        </EntityDocumentsSection>
      ) : null}
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My training</h2>
        {employee?.trainings.length ? (
          <ul className="mt-2 text-sm">
            {employee.trainings.map((training) => (
              <li key={training.id}>
                {training.title} · expires {training.expiresAt?.toLocaleDateString() ?? "n/a"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No assigned training records.</p>
        )}
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My tasks</h2>
        {employee?.tasks.length ? (
          <ul className="mt-2 text-sm">
            {employee.tasks.map((task) => (
              <li key={task.id}>
                {task.title} {task.dueAt ? `· due ${task.dueAt.toLocaleDateString()}` : ""} {task.completedAt ? "· done" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No assigned tasks.</p>
        )}
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My incidents</h2>
        <form action={createIncident} className="mt-3 grid gap-2">
          <select name="type" className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="SAFETY">Safety concern</option>
            <option value="EXPOSURE">Exposure</option>
            <option value="VEHICLE">Vehicle issue</option>
            <option value="PACKAGE">Package incident</option>
            <option value="SECURITY">Security incident</option>
          </select>
          <input name="title" required placeholder="Title" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <textarea name="body" required placeholder="Details" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Submit report</button>
        </form>
        <ul className="mt-4 text-sm">
          {incidents.map((incident) => (
            <li key={incident.id}>{incident.title} · {incident.status} · {incident.createdAt.toLocaleDateString()}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
