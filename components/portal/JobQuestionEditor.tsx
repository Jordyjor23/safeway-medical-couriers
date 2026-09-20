"use client";

import { useState, useTransition } from "react";
import {
  addJobQuestion,
  deleteJobQuestion,
  updateJobQuestion,
} from "@/app/(portal)/dashboard/jobs/actions";

type Question = {
  id: string;
  prompt: string;
  required: boolean;
  answerCount: number;
};

const fieldClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none ring-medical/25 focus:border-medical focus:ring-2";

export function JobQuestionEditor({
  jobId,
  questions,
}: {
  jobId: string;
  questions: Question[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok?: true; error?: string } | undefined>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setMessage(result.error);
      else window.location.reload();
    });
  }

  return (
    <section className="mt-8 rounded-2xl border border-line bg-paper p-5">
      <div>
        <h2 className="text-lg font-semibold text-navy">Application questions</h2>
        <p className="mt-1 text-sm text-muted">
          These questions appear on this job’s public application. Existing answers are protected from deletion.
        </p>
      </div>

      {message ? (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {questions.length === 0 ? (
          <p className="text-sm text-muted">No custom application questions yet.</p>
        ) : (
          questions.map((question, index) => (
            <form
              key={question.id}
              className="rounded-xl border border-line p-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                run(() => updateJobQuestion(jobId, question.id, formData));
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Question {index + 1}
                </p>
                <span className="text-xs text-muted">
                  {question.answerCount} applicant answer{question.answerCount === 1 ? "" : "s"}
                </span>
              </div>
              <input name="prompt" defaultValue={question.prompt} required className={`mt-2 ${fieldClass}`} />
              <label className="mt-3 flex items-center gap-2 text-sm text-navy">
                <input type="checkbox" name="required" defaultChecked={question.required} />
                Required
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Save question
                </button>
                <button
                  type="button"
                  disabled={pending || question.answerCount > 0}
                  title={question.answerCount > 0 ? "Cannot delete a question that has applicant answers." : undefined}
                  className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => {
                    if (!window.confirm("Delete this application question?")) return;
                    run(() => deleteJobQuestion(jobId, question.id));
                  }}
                >
                  Delete
                </button>
              </div>
            </form>
          ))
        )}
      </div>

      <form
        className="mt-5 rounded-xl border border-dashed border-line p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          run(async () => {
            const result = await addJobQuestion(jobId, formData);
            if (!result?.error) form.reset();
            return result;
          });
        }}
      >
        <p className="text-sm font-semibold text-navy">Add a question</p>
        <input name="prompt" required placeholder="Type the applicant question" className={`mt-2 ${fieldClass}`} />
        <label className="mt-3 flex items-center gap-2 text-sm text-navy">
          <input type="checkbox" name="required" defaultChecked />
          Required
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-3 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add question"}
        </button>
      </form>
    </section>
  );
}
