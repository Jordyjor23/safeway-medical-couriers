import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addApplicationNote,
  sendApplicantOnboardingLink,
  updateApplicationStatus,
  updateInterview,
} from "@/app/(portal)/dashboard/applicants/actions";
import { prisma } from "@/lib/db";
import { labelDocumentType } from "@/lib/documents/catalog";
import { documentFileHref } from "@/lib/documents/display";
import { formatBusinessDateTime } from "@/lib/workforce-time";
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

function yesNo(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "Not answered";
  return value ? "Yes" : "No";
}

function textOrNotAnswered(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || "Not answered";
}

function enumLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not answered";
}

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
      answers: { include: { question: true } },
      interviews: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      communications: { orderBy: { createdAt: "desc" } },
      screening: { include: { events: { orderBy: { createdAt: "desc" } } } },
      acknowledgements: { include: { legalDocument: true } },
      documents: {
        include: { document: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!application) notFound();

  const canEdit = hasPermission(ctx, "applicants.edit");
  const canNotes = hasPermission(ctx, "applicants.notes.view");
  const canScreen = hasPermission(ctx, "applicants.screening.view");
  const resumeDocument = application.documents.find(({ document }) => document.documentType === "RESUME")?.document;
  const availability = [
    application.weekdays ? "Weekdays" : null,
    application.weekends ? "Weekends" : null,
    application.holidays ? "Holidays" : null,
    application.earlyMornings ? "Early mornings" : null,
    application.evenings ? "Evenings" : null,
    application.overnight ? "Overnight" : null,
    application.onCallStat ? "On-call / STAT" : null,
  ].filter(Boolean);

  const trainingClaims = [
    { label: "HIPAA training", claimed: application.hipaaTraining, documentType: "HIPAA_TRAINING" },
    { label: "Bloodborne pathogens", claimed: application.bloodbornePathogensTraining, documentType: "BLOODBORNE_PATHOGENS" },
    { label: "HazMat / HMR awareness", claimed: application.hazmatAwarenessTraining, documentType: "HAZMAT_HMR_TRAINING" },
    { label: "UN3373 training", claimed: application.un3373Training, documentType: "UN3373_TRAINING" },
    { label: "Chain of custody training", claimed: application.chainOfCustodyTraining, documentType: "CHAIN_OF_CUSTODY" },
  ].map((training) => ({
    ...training,
    document: application.documents.find(({ document }) => document.documentType === training.documentType)?.document,
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/applicants" className="text-sm font-semibold text-medical hover:underline">
          ← Applicants
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-medical">
          {application.trackingNumber}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">
          {application.applicant.legalFirstName} {application.applicant.legalLastName}
        </h1>
        <p className="mt-1 text-muted">{application.jobOpening.title}</p>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-end gap-3">
          <form
            action={async (formData) => {
              "use server";
              const result = await updateApplicationStatus(applicationId, String(formData.get("status")) as ApplicationStatus);
              if (result?.error) throw new Error(result.error);
              redirect(`/dashboard/applicants/${applicationId}`);
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
          {["CONDITIONAL_OFFER", "BACKGROUND_SCREENING", "ONBOARDING"].includes(application.status) ? (
            <form
              action={async () => {
                "use server";
                await sendApplicantOnboardingLink(applicationId);
              }}
            >
              <button className="rounded-full border border-navy px-4 py-2 text-sm font-semibold text-navy">
                Resend onboarding upload link
              </button>
            </form>
          ) : null}
        </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-navy">Resume</h2>
            <p className="mt-1 text-sm text-muted">
              {resumeDocument ? resumeDocument.originalFileName || "Resume attached" : "No resume attached."}
            </p>
          </div>
          {resumeDocument ? (
            <a
              href={documentFileHref(resumeDocument.id)}
              className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              View / Download Resume
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-navy">Full application review</h2>
            <p className="mt-1 text-sm text-muted">
              Complete answers from the submitted application. Training claims are shown separately from uploaded and verified proof.
            </p>
          </div>
          <span className="rounded-full bg-ice px-3 py-1 text-xs font-semibold text-navy">
            {application.status.replaceAll("_", " ")}
          </span>
        </div>

        <div className="mt-6 space-y-7">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Availability & preferences</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-muted">Employment type</dt><dd className="font-medium text-navy">{enumLabel(application.preferredEmploymentType)}</dd></div>
              <div><dt className="text-muted">Preferred shift</dt><dd className="font-medium text-navy">{textOrNotAnswered(application.preferredShift)}</dd></div>
              <div><dt className="text-muted">Full-time preference</dt><dd className="font-medium text-navy">{yesNo(application.fullTimePreference)}</dd></div>
              <div><dt className="text-muted">Available start date</dt><dd className="font-medium text-navy">{application.availableStartDate ? application.availableStartDate.toLocaleDateString("en-US", { timeZone: "UTC" }) : "Not answered"}</dd></div>
              <div><dt className="text-muted">Service areas</dt><dd className="font-medium text-navy">{textOrNotAnswered(application.serviceAreas)}</dd></div>
              <div><dt className="text-muted">Availability</dt><dd className="font-medium text-navy">{availability.length ? availability.join(", ") : textOrNotAnswered(application.generalAvailability)}</dd></div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Work authorization & essential functions</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-muted">Authorized to work in U.S.</dt><dd className="font-medium text-navy">{yesNo(application.authorizedToWorkUs)}</dd></div>
              <div><dt className="text-muted">Requires sponsorship</dt><dd className="font-medium text-navy">{yesNo(application.requiresSponsorship)}</dd></div>
              <div><dt className="text-muted">Can perform essential functions</dt><dd className="font-medium text-navy">{yesNo(application.canPerformEssentialFunctions)}</dd></div>
              <div><dt className="text-muted">Highest education</dt><dd className="font-medium text-navy">{textOrNotAnswered(application.highestEducation)}</dd></div>
              <div><dt className="text-muted">Relevant training</dt><dd className="font-medium text-navy whitespace-pre-wrap">{textOrNotAnswered(application.relevantTraining)}</dd></div>
              <div><dt className="text-muted">Licenses</dt><dd className="font-medium text-navy whitespace-pre-wrap">{textOrNotAnswered(application.licenses)}</dd></div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Experience</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Courier experience</dt><dd className="font-medium text-navy whitespace-pre-wrap">{textOrNotAnswered(application.courierExperience)}</dd></div>
              <div><dt className="text-muted">Healthcare logistics experience</dt><dd className="font-medium text-navy whitespace-pre-wrap">{textOrNotAnswered(application.healthcareLogisticsExperience)}</dd></div>
              <div><dt className="text-muted">Customer service experience</dt><dd className="font-medium text-navy whitespace-pre-wrap">{textOrNotAnswered(application.customerServiceExperience)}</dd></div>
              <div><dt className="text-muted">Dispatch experience</dt><dd className="font-medium text-navy whitespace-pre-wrap">{textOrNotAnswered(application.dispatchExperience)}</dd></div>
              <div><dt className="text-muted">Technology experience</dt><dd className="font-medium text-navy whitespace-pre-wrap">{textOrNotAnswered(application.technologyExperience)}</dd></div>
              <div><dt className="text-muted">Other certifications entered</dt><dd className="font-medium text-navy whitespace-pre-wrap">{textOrNotAnswered(application.certifications)}</dd></div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Training & certification proof</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-ice text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Training</th>
                    <th className="px-3 py-2">Claimed</th>
                    <th className="px-3 py-2">Document</th>
                    <th className="px-3 py-2">Verification</th>
                    <th className="px-3 py-2">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {trainingClaims.map((training) => (
                    <tr key={training.label}>
                      <td className="px-3 py-3 font-medium text-navy">{training.label}</td>
                      <td className="px-3 py-3">{training.claimed ? "Yes" : "No"}</td>
                      <td className="px-3 py-3">{training.document ? "Uploaded" : "Not uploaded"}</td>
                      <td className="px-3 py-3">
                        {training.document ? training.document.verificationStatus.replaceAll("_", " ") : "Not verified"}
                      </td>
                      <td className="px-3 py-3">
                        {training.document ? (
                          <a href={documentFileHref(training.document.id)} className="font-semibold text-medical hover:underline">
                            View
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Driving & vehicle requirements</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-muted">Valid driver&apos;s license</dt><dd className="font-medium text-navy">{yesNo(application.hasValidDriversLicense)}</dd></div>
              <div><dt className="text-muted">License state</dt><dd className="font-medium text-navy">{textOrNotAnswered(application.licenseIssuingState)}</dd></div>
              <div><dt className="text-muted">License class</dt><dd className="font-medium text-navy">{textOrNotAnswered(application.licenseClass)}</dd></div>
              <div><dt className="text-muted">Can meet driving requirements</dt><dd className="font-medium text-navy">{yesNo(application.canMeetDrivingRequirements)}</dd></div>
              <div><dt className="text-muted">Personal vehicle</dt><dd className="font-medium text-navy">{yesNo(application.hasPersonalVehicle)}</dd></div>
              <div><dt className="text-muted">Vehicle type</dt><dd className="font-medium text-navy">{textOrNotAnswered(application.vehicleType)}</dd></div>
              <div><dt className="text-muted">Proof of insurance claimed</dt><dd className="font-medium text-navy">{yesNo(application.proofOfInsurance)}</dd></div>
              <div><dt className="text-muted">Can use GPS apps</dt><dd className="font-medium text-navy">{yesNo(application.canUseGpsApps)}</dd></div>
              <div><dt className="text-muted">Courier driving experience</dt><dd className="font-medium text-navy whitespace-pre-wrap">{textOrNotAnswered(application.relevantCourierDrivingExperience)}</dd></div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Specialized delivery experience</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-muted">Temperature-controlled</dt><dd className="font-medium text-navy">{yesNo(application.temperatureControlledExperience)}</dd></div>
              <div><dt className="text-muted">Pharmaceutical delivery</dt><dd className="font-medium text-navy">{yesNo(application.pharmaceuticalDeliveryExperience)}</dd></div>
              <div><dt className="text-muted">Laboratory courier</dt><dd className="font-medium text-navy">{yesNo(application.laboratoryCourierExperience)}</dd></div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Employment history</h3>
            {application.employmentHistory.length ? (
              <div className="mt-3 space-y-3">
                {application.employmentHistory.map((row) => (
                  <div key={row.id} className="rounded-xl border border-line p-3 text-sm">
                    <p className="font-semibold text-navy">{row.employerName} — {row.positionTitle}</p>
                    <p className="mt-1 text-muted">
                      {row.startDate.toLocaleDateString("en-US", { timeZone: "UTC" })} – {row.endDate ? row.endDate.toLocaleDateString("en-US", { timeZone: "UTC" }) : "Present"}
                    </p>
                    {row.responsibilities ? <p className="mt-2 whitespace-pre-wrap">{row.responsibilities}</p> : null}
                    {row.reasonForLeaving ? <p className="mt-1 text-muted">Reason for leaving: {row.reasonForLeaving}</p> : null}
                  </div>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-muted">No employment history entered.</p>}
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Job-specific questions</h3>
            {application.answers.length ? (
              <dl className="mt-3 space-y-3 text-sm">
                {[...application.answers]
                  .sort((a, b) => a.question.sortOrder - b.question.sortOrder)
                  .map((answer) => (
                    <div key={answer.id} className="rounded-xl border border-line p-3">
                      <dt className="font-semibold text-navy">{answer.question.prompt}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-muted">{answer.answer}</dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">No job-specific question responses were saved for this application.</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy">Legal acknowledgements</h3>
            {application.acknowledgements.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {application.acknowledgements.map((ack) => (
                  <li key={ack.id} className="rounded-xl border border-line p-3">
                    <span className="font-semibold text-navy">{ack.legalDocument.title}</span>
                    <span className="text-muted"> · Version {ack.legalDocument.version} · Accepted {formatBusinessDateTime(ack.acceptedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-muted">No legal acknowledgements are attached to this application.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="text-lg font-semibold text-navy">Candidate documents</h2>
        <p className="mt-1 text-sm text-muted">
          Files submitted through the secure onboarding link remain unverified until reviewed.
        </p>
        {application.documents.length ? (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {application.documents.map(({ document }) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-navy">{document.name}</p>
                  <p className="text-muted">
                    {labelDocumentType(document.documentType)} · {document.verificationStatus.replaceAll("_", " ")}
                  </p>
                  {document.rejectionReason ? <p className="text-red-700">Rejected: {document.rejectionReason}</p> : null}
                </div>
                <a
                  href={documentFileHref(document.id)}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy"
                >
                  View / Download
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No candidate documents uploaded yet.</p>
        )}
      </section>

      {canEdit ? (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-navy">Interview</h2>
              <p className="mt-1 text-sm text-muted">
                Schedule the interview, then open the scorecard to work through the questions and record answers.
              </p>
            </div>
            <Link
              href={`/dashboard/applicants/${applicationId}/interview`}
              className="rounded-full border border-navy px-4 py-2 text-sm font-semibold text-navy"
            >
              Open interview scorecard
            </Link>
          </div>
          <form
            action={async (formData) => {
              "use server";
              await updateInterview(applicationId, formData);
            }}
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            <label className="text-sm font-semibold text-navy">
              Interview date & time (Eastern Time)
              <input
                name="scheduledAt"
                type="datetime-local"
                required
                className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Location / video link
              <input name="location" placeholder="Office address or meeting link" className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-semibold text-navy">
              Interviewer
              <input name="interviewer" placeholder="Interviewer name" className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end">
              <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:w-fit">Save interview & notify applicant</button>
            </div>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {application.interviews.map((interview) => (
              <li key={interview.id}>{interview.scheduledAt ? formatBusinessDateTime(interview.scheduledAt) : "Unscheduled"} · {interview.status}</li>
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
        <h2 className="text-lg font-semibold text-navy">Candidate communications</h2>
        <p className="mt-1 text-sm text-muted">
          Outbound onboarding emails are recorded here so HR can confirm whether the email provider accepted the send.
        </p>
        {application.communications.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {application.communications.map((item) => (
              <li key={item.id} className="rounded-xl border border-line bg-ice p-3">
                <p className="font-semibold text-navy">{item.subject ?? item.channel}</p>
                <p className="mt-1 text-muted">{item.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatBusinessDateTime(item.createdAt)} · {item.direction}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No communications recorded yet.</p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="text-lg font-semibold text-navy">Audit history</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {application.statusHistory.map((item) => (
            <li key={item.id}>
              {formatBusinessDateTime(item.createdAt)} · {item.fromStatus ?? "—"} → {item.toStatus}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
