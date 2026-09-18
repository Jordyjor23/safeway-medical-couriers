import Link from "next/link";
import { createIncident } from "@/app/(portal)/deliveries/actions";
import { EntityDocumentsSection } from "@/components/portal/EntityDocumentsSection";
import { DocumentUploader } from "@/components/portal/DocumentUploader";
import { employeeDocumentBuckets, missingRequirementLabels } from "@/lib/documents/buckets";
import { DOCUMENT_LIST_INCLUDE, documentLibraryWhere } from "@/lib/documents/query";
import { prisma } from "@/lib/db";
import { getLeaveSummary } from "@/lib/leave";
import { employeeOnboardingDocumentRequirements } from "@/lib/onboarding-documents";
import { isPrivateStorageConfigured } from "@/lib/storage";
import { assertSameEmployee, hasPermission, requirePortal } from "@/lib/rbac";
import { formatBusinessDate, formatBusinessDateTime } from "@/lib/workforce-time";

export default async function EmployeeDashboardPage() {
  const ctx = await requirePortal("employee");
  const employeeId = ctx.user.employeeId;

  if (!employeeId) {
    return (
      <div>
        <h1 className="text-3xl font-semibold text-navy">Employee portal</h1>
        <p className="mt-3 text-muted">
          Your login is active, but it is not linked to an employee profile yet. Contact an administrator.
        </p>
      </div>
    );
  }

  const now = new Date();
  const [employee, nextShift, openEntry, pendingTimeOff, incidents] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        trainings: true,
        tasks: { orderBy: { createdAt: "desc" } },
        manager: true,
      },
    }),
    prisma.employeeShift.findFirst({
      where: { employeeId, status: "PUBLISHED", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.timeEntry.findFirst({
      where: { employeeId, clockOut: null, status: "OPEN" },
      orderBy: { clockIn: "desc" },
    }),
    prisma.timeOffRequest.count({ where: { employeeId, status: "PENDING" } }),
    prisma.incidentReport.findMany({
      where: { reporterUserId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!employee) return null;
  assertSameEmployee(ctx, employee.id);
  const leaveSummary = await getLeaveSummary(employee.id);

  const canViewDocuments = hasPermission(ctx, "documents.view");
  const [documents, rules, records] = await Promise.all([
    canViewDocuments
      ? prisma.managedDocument.findMany({
          where: documentLibraryWhere(ctx, { employeeId: employee.id, archived: "all" }),
          include: DOCUMENT_LIST_INCLUDE,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canViewDocuments
      ? prisma.documentRequirementRule.findMany({ include: { requirement: true } })
      : Promise.resolve([]),
    canViewDocuments
      ? prisma.complianceRecord.findMany({
          where: { employeeId: employee.id },
          include: { requirement: true },
        })
      : Promise.resolve([]),
  ]);

  const buckets = employeeDocumentBuckets(documents);
  const missing = missingRequirementLabels({ rules, records, documents });
  const canUploadDocuments = hasPermission(ctx, "documents.upload") && isPrivateStorageConfigured();
  const requestedDocuments = employeeOnboardingDocumentRequirements({
    classification: employee.classification,
    isDriver: employee.isDriver,
  });
  const activeDocumentTypes = new Set(
    documents
      .filter((document) => document.lifecycleStatus !== "ARCHIVED" && document.verificationStatus !== "REJECTED")
      .map((document) => document.documentType)
      .filter((type): type is string => Boolean(type)),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Employee self-service</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">
          Hi, {employee.preferredName || employee.legalFirstName}
        </h1>
        <p className="mt-2 text-muted">
          {employee.jobTitle} · {employee.employeeNumber}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/employee/schedule" className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-sm font-semibold text-muted">Next shift</p>
          <p className="mt-2 font-semibold text-navy">
            {nextShift ? formatBusinessDateTime(nextShift.startsAt) : "No published shift"}
          </p>
        </Link>
        <Link href="/employee/timecards" className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-sm font-semibold text-muted">Timecard</p>
          <p className="mt-2 font-semibold text-navy">{openEntry ? "Clocked in" : "Not clocked in"}</p>
        </Link>
        <Link href="/employee/time-off" className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-sm font-semibold text-muted">Pending PTO / leave</p>
          <p className="mt-2 text-2xl font-semibold text-navy">{pendingTimeOff}</p>
        </Link>
      </div>

      {leaveSummary.length ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-navy">My leave balances</h2><Link href="/employee/time-off" className="text-sm font-semibold text-medical hover:underline">Request time off</Link></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">{leaveSummary.map(bank=><div key={bank.type} className="rounded-xl border border-line p-4"><p className="text-xs font-semibold uppercase text-muted">{bank.type}</p><p className="mt-1 text-xl font-semibold text-navy">{bank.availableHours.toFixed(2)} hrs</p><p className="mt-1 text-xs text-muted">{bank.pendingHours.toFixed(2)} pending · {bank.usedHours.toFixed(2)} used</p></div>)}</div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My profile</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Name</dt>
            <dd>{employee.legalFirstName} {employee.legalLastName}</dd>
          </div>
          <div>
            <dt className="text-muted">Employee ID</dt>
            <dd>{employee.employeeNumber}</dd>
          </div>
          <div>
            <dt className="text-muted">Title</dt>
            <dd>{employee.jobTitle}</dd>
          </div>
          <div>
            <dt className="text-muted">Department</dt>
            <dd>{employee.department ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Manager</dt>
            <dd>
              {employee.manager
                ? `${employee.manager.legalFirstName} ${employee.manager.legalLastName}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd>{employee.email}</dd>
          </div>
        </dl>
      </section>

      {canViewDocuments ? (
        <>
          <section className="rounded-2xl border border-line bg-paper p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-navy">Onboarding documents</h2>
                <p className="mt-1 text-sm text-muted">
                  Upload requested documents here. Submitted files remain pending until Safeway reviews them.
                </p>
              </div>
              {canUploadDocuments ? (
                <DocumentUploader
                  associations={{ employee: false, customer: false, contract: false, delivery: false }}
                  preset={{
                    employeeId: employee.id,
                    employeeLabel: `${employee.legalFirstName} ${employee.legalLastName}`,
                    category: "EMPLOYEE_DOCUMENTS",
                  }}
                  triggerLabel="Upload document"
                  allowedCategories={["EMPLOYEE_DOCUMENTS", "DRIVER_DOCUMENTS", "TRAINING", "VEHICLE"]}
                  redirectOnSuccess={false}
                />
              ) : null}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {requestedDocuments.map((item) => {
                const submitted = activeDocumentTypes.has(item.type);
                return (
                  <div key={item.type} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-navy">{item.label}</p>
                      {item.sensitive ? <p className="text-xs text-muted">Sensitive document</p> : null}
                    </div>
                    <span className={submitted ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                      {submitted ? "Submitted" : "Needed"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">
              “Submitted” means a file is on record; it does not mean the document has been verified or approved.
            </p>
          </section>

          <EntityDocumentsSection
            title="Your documents"
            documents={documents}
            canDownload={hasPermission(ctx, "documents.download")}
            canOpenDetails={false}
            missing={missing}
            sections={[
              { label: "Your documents", documents: buckets.uploaded, empty: "No current files." },
              { label: "Expiring soon", documents: buckets.expiringSoon, empty: "None." },
              { label: "Expired", documents: buckets.expired, empty: "None." },
              { label: "Rejected", documents: buckets.rejected, empty: "None." },
              { label: "Needs action", documents: buckets.needsAction, empty: "Nothing needs action." },
            ]}
            emptyBody="No assigned handbook, policy, or other files yet."
          />
        </>
      ) : null}

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My training</h2>
        {employee.trainings.length ? (
          <ul className="mt-2 text-sm">
            {employee.trainings.map((training) => (
              <li key={training.id}>
                {training.title} · expires {training.expiresAt ? formatBusinessDate(training.expiresAt) : "n/a"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No assigned training records.</p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My tasks</h2>
        {employee.tasks.length ? (
          <ul className="mt-2 text-sm">
            {employee.tasks.map((task) => (
              <li key={task.id}>
                {task.title} {task.dueAt ? `· due ${formatBusinessDate(task.dueAt)}` : ""}{" "}
                {task.completedAt ? "· done" : ""}
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
          <input
            name="title"
            required
            placeholder="Title"
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <textarea
            name="body"
            required
            placeholder="Details"
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
            Submit report
          </button>
        </form>
        <ul className="mt-4 text-sm">
          {incidents.map((incident) => (
            <li key={incident.id}>
              {incident.title} · {incident.status} · {formatBusinessDate(incident.createdAt)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
