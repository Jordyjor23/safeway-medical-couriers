"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_ACCEPT, labelDocumentType } from "@/lib/documents/catalog";

type ExistingDocument = {
  id: string;
  name: string;
  documentType: string | null;
  lifecycleStatus: string;
  verificationStatus: string;
  rejectionReason?: string | null;
};

export function CandidateOnboardingUploader({
  token,
  allowedTypes,
  documents,
}: {
  token: string;
  allowedTypes: string[];
  documents: ExistingDocument[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState(allowedTypes[0] ?? "");
  const [name, setName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function upload() {
    if (!file || !documentType) {
      setError("Choose a document type and file.");
      return;
    }
    setPending(true);
    setError(null);
    setSuccess(null);
    const body = new FormData();
    body.set("file", file);
    body.set("documentType", documentType);
    if (name.trim()) body.set("name", name.trim());
    if (effectiveDate) body.set("effectiveDate", effectiveDate);
    if (expirationDate) body.set("expirationDate", expirationDate);

    const response = await fetch("/api/careers/onboarding/" + encodeURIComponent(token) + "/documents", {
      method: "POST",
      body,
    });
    const payload = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) {
      setError(payload?.error ?? "The document could not be uploaded.");
      return;
    }
    setSuccess("Document submitted for review.");
    setFile(null);
    setName("");
    setEffectiveDate("");
    setExpirationDate("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-semibold text-mist">Upload onboarding document</h2>
        <p className="mt-2 text-sm text-mist-soft">
          Files are private and reviewed by Safeway before they count toward onboarding.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-mist">
            Document type
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              className="mkt-field"
            >
              {allowedTypes.map((type) => (
                <option key={type} value={type}>
                  {labelDocumentType(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-mist">
            File
            <input
              ref={fileRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mkt-field"
            />
          </label>
          <label className="text-sm font-semibold text-mist">
            Display name (optional)
            <input value={name} onChange={(event) => setName(event.target.value)} className="mkt-field" />
          </label>
          <label className="text-sm font-semibold text-mist">
            Issue / effective date (optional)
            <input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} className="mkt-field" />
          </label>
          <label className="text-sm font-semibold text-mist">
            Expiration date (optional)
            <input type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} className="mkt-field" />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-red-400" role="alert">{error}</p> : null}
        {success ? <p className="mt-4 text-sm font-semibold text-emerald-300" role="status">{success}</p> : null}

        <button
          type="button"
          disabled={pending}
          onClick={() => void upload()}
          className="mkt-btn mkt-btn-primary mt-5 disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Upload for review"}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-semibold text-mist">Submitted documents</h2>
        {documents.length ? (
          <ul className="mt-4 space-y-3">
            {documents.map((document) => (
              <li key={document.id} className="rounded-xl border border-white/10 p-4 text-sm">
                <p className="font-semibold text-mist">{document.name}</p>
                <p className="mt-1 text-mist-soft">
                  {labelDocumentType(document.documentType)} · {document.verificationStatus.replaceAll("_", " ")}
                </p>
                {document.rejectionReason ? (
                  <p className="mt-1 text-red-300">Needs correction: {document.rejectionReason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-mist-soft">No onboarding files submitted yet.</p>
        )}
      </section>
    </div>
  );
}
