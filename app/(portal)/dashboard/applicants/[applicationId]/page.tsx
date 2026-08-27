import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  addApplicationNote,
  updateApplicationStatus,
  updateInterview,
} from "@/app/(portal)/dashboard/applicants/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";
import type { ApplicationStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Applicant" };

const statuses: ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW_REQUESTED",
  "INTERVIEW_SCHEDULED",
  "CONDITIONAL_OFFER",
  "BACKGROUND_SCREENING",
  "ONBOARDING",
  "HIRED",
  "POSITION_FILLED",
  "WITHDRAWN",
  "NOT_SELECTED",
];

export default async function ApplicantProfilePage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const ctx = await requirePermission("applicants.view");
  const { applicationId } = await params;
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      applicant: true,
      jobOpening: true,
      employmentHistory: { orderBy: { sortOrder: "asc" } },
      interviews: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      communications: { orderBy: { createdAt: "desc" } },
      screening: { include: { events: { orderBy: { createdAt: "desc" } } } },
      acknowledgements: { include: { legalDocument: true } },
    },
  });
  if (!application) notFound();

  const canEdit = hasPermission(ctx, "applicants.edit");
  const canNotes = hasPermission(ctx, "applicants.notes.view");
  const canScreen = hasPermission(ctx, "applicants.screening.view");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">
          {application.trackingNumber}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">
          {application.applicant.legalFirstName} {application.applicant.legalLastName}
        </h1>
        <p className="mt-1 text-muted">{application.jobOpening.title}</p>
      </div>

      {canEdit ? (
        <form
          action={async (formData) => {
            "use server";
            await updateApplicationStatus(applicationId, String(formData.get("status")) as ApplicationStatus);
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="text-sm font-semibold text-navy">
            Status
            <select name="status" defaultValue={application.status} className="mt-1.5 rounded-lg border border-line px-3 py-2 text-sm">
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Update status</button>
        </form>
      ) : null}

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="text-lg font-semibold text-navy">Overview</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Email</dt><dd>{application.applicant.email}</dd></div>
          <div><dt className="text-muted">Phone</dt><dd>{application.applicant.phone}</dd></div>
          <div><dt className="text-muted">Location</dt><dd>{application.applicant.city}, {application.applicant.state} {application.applicant.zip}</dd></div>
          <div><dt className="text-muted">Work authorized</dt><dd>{application.authorizedToWorkUs ? "Yes" : "No"}</dd></div>
        </dl>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="text-lg font-semibold text-navy">Application</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{application.courierExperience || "No courier experience entered."}</p>
        <ul className="mt-4 space-y-2 text-sm">
          {application.employmentHistory.map((row) => (
            <li key={row.id}>{row.employerName} — {row.positionTitle}</li>
          ))}
        </ul>
      </section>

      {canEdit ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="text-lg font-semibold text-navy">Interview</h2>
          <form action={updateInterview.bind(null, applicationId)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input name="scheduledAt" type="datetime-local" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="location" placeholder="Location / video link" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="interviewer" placeholder="Interviewer" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:w-fit">Save interview</button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {application.interviews.map((interview) => (
              <li key={interview.id}>{interview.scheduledAt?.toLocaleString() ?? "Unscheduled"} · {interview.status}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {canScreen ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="text-lg font-semibold text-navy">Screening</h2>
          <p className="mt-2 text-sm text-muted">
            FCRA disclosure and authorization is a standalone workflow. Status:{" "}
            {application.screening?.status ?? "NOT STARTED"}.
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted">Background-screening details are restricted.</p>
      )}

      {canNotes ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="text-lg font-semibold text-navy">Notes</h2>
          <form action={addApplicationNote.bind(null, applicationId)} className="mt-3">
            <textarea name="body" required rows={3} className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
            <button className="mt-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Add note</button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {application.notes.map((note) => (
              <li key={note.id} className="rounded-lg bg-ice px-3 py-2">{note.body}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="text-lg font-semibold text-navy">Audit history</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {application.statusHistory.map((item) => (
            <li key={item.id}>
              {item.createdAt.toLocaleString()} · {item.fromStatus ?? "—"} → {item.toStatus}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
