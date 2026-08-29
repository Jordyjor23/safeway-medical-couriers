"use client";

import { rejectDocumentAction, verifyDocumentAction } from "@/app/(portal)/dashboard/documents/actions";

export function VerifyDocumentPanel({ documentId }: { documentId: string }) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-semibold text-navy">Verification</h2>
      <p className="mt-1 text-sm text-muted">
        Verification is a human action. OCR suggestions do not make a document compliant.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <form
          action={async (formData) => {
            formData.set("documentId", documentId);
            await verifyDocumentAction(formData);
          }}
        >
          <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Mark verified</button>
        </form>
        <form
          className="flex flex-wrap items-end gap-2"
          action={async (formData) => {
            formData.set("documentId", documentId);
            await rejectDocumentAction(formData);
          }}
        >
          <label className="text-sm font-semibold text-navy">
            Rejection reason
            <input name="rejectionReason" required minLength={3} className="mt-1.5 rounded-lg border border-line px-3 py-2 text-sm" />
          </label>
          <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy">Reject</button>
        </form>
      </div>
    </section>
  );
}
