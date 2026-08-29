"use client";

import { useState } from "react";
import { archiveDocumentAction, restoreDocumentAction } from "@/app/(portal)/dashboard/documents/actions";
import { ARCHIVE_CONFIRMATION } from "@/lib/documents/catalog";

export function ArchiveDocumentButton({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy" onClick={() => setOpen(true)}>
        Archive
      </button>
    );
  }

  return (
    <form
      className="rounded-xl border border-line bg-ice p-3 text-sm"
      action={async (formData) => {
        formData.set("documentId", documentId);
        formData.set("confirm", "1");
        const result = await archiveDocumentAction(formData);
        if (result && "error" in result && result.error) setError(result.error);
        else setOpen(false);
      }}
    >
      <p>{ARCHIVE_CONFIRMATION}</p>
      <label className="mt-2 block text-navy">
        Reason (optional)
        <input name="archiveReason" className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
      </label>
      {error ? (
        <p className="mt-2 text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button type="submit" className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
          Confirm archive
        </button>
        <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function RestoreDocumentButton({ documentId }: { documentId: string }) {
  return (
    <form
      action={async (formData) => {
        await restoreDocumentAction(formData);
      }}
    >
      <input type="hidden" name="documentId" value={documentId} />
      <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy">Restore</button>
    </form>
  );
}
