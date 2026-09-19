import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { saveInterviewScorecard } from "@/app/(portal)/dashboard/applicants/actions";
import { prisma } from "@/lib/db";
import { interviewMaxScoreFor, interviewQuestionsFor } from "@/lib/interview-scorecard";
import { formatBusinessDateTime } from "@/lib/workforce-time";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Applicant interview" };

type SavedResponse = {
  key?: string;
  answer?: string;
  score?: number | null;
  checked?: boolean;
};

function readResponses(scorecard: unknown) {
  if (!scorecard || typeof scorecard !== "object") return new Map<string, SavedResponse>();
  const value = scorecard as { responses?: unknown };
  if (!Array.isArray(value.responses)) return new Map<string, SavedResponse>();
  return new Map(
    value.responses
      .filter((item): item is SavedResponse => Boolean(item) && typeof item === "object")
      .map((item) => [String(item.key ?? ""), item]),
  );
}

export default async function ApplicantInterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requirePermission("applicants.edit");
  const { applicationId } = await params;
  const query = await searchParams;
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      applicant: true,
      jobOpening: true,
      interviews: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!application) notFound();

  const interview = application.interviews[0] ?? null;
  const questions = interviewQuestionsFor(application.jobOpening.workerClassification);
  const maxScore = interviewMaxScoreFor(application.jobOpening.workerClassification);
  const savedResponses = readResponses(interview?.scorecard);
  const scoreTotal = interview?.scoreTotal ?? 0;
  const scorePossible = interview?.scorePossible ?? 0;
  const percent = scorePossible > 0 ? Math.round((scoreTotal / scorePossible) * 100) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/applicants/${applicationId}`}
          className="text-sm font-semibold text-medical hover:underline"
        >
          ← Back to applicant
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-medical">
          Interview scorecard
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">
          {application.applicant.legalFirstName} {application.applicant.legalLastName}
        </h1>
        <p className="mt-1 text-muted">{application.jobOpening.title}</p>
      </div>

      {query.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {query.error}
        </div>
      ) : query.saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {query.saved === "completed" ? "Interview completed and saved." : "Interview progress saved."}
        </div>
      ) : null}

      <section className="rounded-2xl border border-line bg-paper p-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted">Application status</p>
            <p className="font-semibold text-navy">{application.status.replaceAll("_", " ")}</p>
          </div>
          <div>
            <p className="text-muted">Interview status</p>
            <p className="font-semibold text-navy">{(interview?.status ?? application.interviewStatus).replaceAll("_", " ")}</p>
          </div>
          <div>
            <p className="text-muted">Scheduled</p>
            <p className="font-semibold text-navy">
              {interview?.scheduledAt ? formatBusinessDateTime(interview.scheduledAt) : "Not scheduled"}
            </p>
          </div>
          <div>
            <p className="text-muted">Current score</p>
            <p className="font-semibold text-navy">
              {scorePossible ? `${scoreTotal}/${scorePossible} (${percent}%)` : `Not scored / ${maxScore} max`}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">
          This score summarizes interviewer-entered, job-related responses only. It does not make the hiring decision; final advancement remains a human review.
        </p>
      </section>


      {interview?.status === "COMPLETED" ? (
        <section className="rounded-2xl border border-medical/30 bg-paper p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-navy">Post-interview review</h2>
              <p className="mt-1 text-sm text-muted">
                Review the interview evidence and any remaining requirements before deciding the next workflow step.
              </p>
            </div>
            <span className="rounded-full bg-ice px-3 py-1 text-sm font-semibold text-navy">
              {scorePossible ? `${scoreTotal}/${scorePossible} (${percent}%)` : "Not scored"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line p-3 text-sm">
              <p className="text-muted">Questions completed</p>
              <p className="font-semibold text-navy">
                {questions.filter((question) => savedResponses.get(question.key)?.checked).length} / {questions.length}
              </p>
            </div>
            <div className="rounded-xl border border-line p-3 text-sm">
              <p className="text-muted">Questions scored</p>
              <p className="font-semibold text-navy">
                {questions.filter((question) => savedResponses.get(question.key)?.score).length} / {questions.length}
              </p>
            </div>
            <div className="rounded-xl border border-line p-3 text-sm">
              <p className="text-muted">Candidate type</p>
              <p className="font-semibold text-navy">{application.jobOpening.workerClassification.replaceAll("_", " ")}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <form
              action={async () => {
                "use server";
                const { updateApplicationStatus } = await import("@/app/(portal)/dashboard/applicants/actions");
                await updateApplicationStatus(applicationId, "CONDITIONAL_OFFER");
              }}
            >
              <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
                Move to Conditional Offer
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                const { updateApplicationStatus } = await import("@/app/(portal)/dashboard/applicants/actions");
                await updateApplicationStatus(applicationId, "UNDER_REVIEW");
              }}
            >
              <button className="rounded-full border border-navy px-4 py-2 text-sm font-semibold text-navy">
                Hold for Review
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                const { updateApplicationStatus } = await import("@/app/(portal)/dashboard/applicants/actions");
                await updateApplicationStatus(applicationId, "NOT_SELECTED");
              }}
            >
              <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted">
                Not Selected
              </button>
            </form>
          </div>
          <p className="mt-3 text-xs text-muted">
            The score is decision support only. Use the candidate&apos;s job-related responses, required documents, and role requirements when deciding the next step.
          </p>
        </section>
      ) : null}

      <form
        action={async (formData) => {
          "use server";
          const result = await saveInterviewScorecard(applicationId, formData);
          if (result?.error) {
            redirect(
              `/dashboard/applicants/${applicationId}/interview?error=${encodeURIComponent(result.error)}`,
            );
          }
          redirect(
            `/dashboard/applicants/${applicationId}/interview?saved=${result?.completed ? "completed" : "progress"}`,
          );
        }}
        className="space-y-6"
      >
        {Array.from(new Set(questions.map((question) => question.category))).map((category) => (
          <section key={category} className="rounded-2xl border border-line bg-paper p-5">
            <h2 className="text-lg font-semibold text-navy">{category}</h2>
            <div className="mt-4 space-y-5">
              {questions.filter((question) => question.category === category).map((question, index) => {
                const saved = savedResponses.get(question.key);
                return (
                  <div key={question.key} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-3xl">
                        <p className="font-semibold text-navy">
                          {index + 1}. {question.prompt}
                        </p>
                        <p className="mt-1 text-xs text-muted">{question.guidance}</p>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium text-navy">
                        <input
                          type="checkbox"
                          name={`asked_${question.key}`}
                          defaultChecked={saved?.checked ?? false}
                        />
                        Asked
                      </label>
                    </div>

                    <label className="mt-4 block text-sm font-semibold text-navy">
                      Candidate answer / interviewer notes
                      <textarea
                        name={`answer_${question.key}`}
                        defaultValue={saved?.answer ?? ""}
                        rows={4}
                        className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm"
                        placeholder="Capture the candidate's answer and relevant job-related notes."
                      />
                    </label>

                    <label className="mt-3 block max-w-xs text-sm font-semibold text-navy">
                      Interviewer score
                      <select
                        name={`score_${question.key}`}
                        defaultValue={saved?.score ? String(saved.score) : ""}
                        className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm"
                      >
                        <option value="">Not scored</option>
                        <option value="1">1 — Did not demonstrate</option>
                        <option value="2">2 — Limited evidence</option>
                        <option value="3">3 — Meets expectation</option>
                        <option value="4">4 — Strong evidence</option>
                        <option value="5">5 — Excellent evidence</option>
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="text-lg font-semibold text-navy">Overall interview notes</h2>
          <textarea
            name="overallNotes"
            defaultValue={interview?.notes ?? ""}
            rows={5}
            className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm"
            placeholder="Document job-related strengths, concerns, follow-up items, or verification needed."
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              name="submitIntent"
              value="save"
              className="rounded-full border border-navy px-4 py-2 text-sm font-semibold text-navy"
            >
              Save interview progress
            </button>
            <button
              type="submit"
              name="submitIntent"
              value="complete"
              className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              Complete interview
            </button>
          </div>
          {interview?.completedAt ? (
            <p className="mt-3 text-sm text-muted">Completed {formatBusinessDateTime(interview.completedAt)}</p>
          ) : null}
        </section>
      </form>
    </div>
  );
}
