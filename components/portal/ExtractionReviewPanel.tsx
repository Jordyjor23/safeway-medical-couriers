"use client";

import { useState } from "react";
import {
  acceptHighConfidenceAction,
  retryDocumentExtractionAction,
  reviewFieldAction,
  reviewSuggestedTypeAction,
} from "@/app/(portal)/dashboard/documents/actions";
import { labelDocumentType } from "@/lib/documents/catalog";
import { DOCUMENT_TYPES } from "@/lib/documents/types";
import { confidenceBand } from "@/lib/documents/extraction/normalize";
import { extractionManualEntryNotice } from "@/lib/documents/extraction/unsupported";

type Field = {
  id: string;
  fieldKey: string;
  displayLabel: string;
  rawValue: string;
  proposedValue: string;
  confidence: number;
  reviewStatus: string;
  ambiguousDate: boolean;
  mapsToDocumentField: string | null;
  sourcePage?: number | null;
};

export function ExtractionReviewPanel({
  documentId,
  extractionStatus,
  extractionError,
  suggestedDocumentType,
  suggestedTypeConfidence,
  suggestedTypeStatus,
  fields,
  canEdit,
  canExtract,
  mimeType,
  filename,
}: {
  documentId: string;
  extractionStatus: string;
  extractionError: string | null;
  suggestedDocumentType: string | null;
  suggestedTypeConfidence: number | null;
  suggestedTypeStatus: string | null;
  fields: Field[];
  canEdit: boolean;
  canExtract: boolean;
  mimeType?: string | null;
  filename?: string | null;
}) {
  const [typeChoice, setTypeChoice] = useState(suggestedDocumentType ?? "");
  const manualNotice = extractionManualEntryNotice({
    extractionStatus,
    extractionError,
    mimeType,
    filename,
  });

  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-semibold text-navy">Extraction review</h2>
      <p className="mt-1 text-sm text-muted">
        Suggestions are not verification. Accepted values update this document&apos;s metadata only — not employee or customer profiles.
      </p>
      {manualNotice ? (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {manualNotice}
        </p>
      ) : null}
      <p className="mt-2 text-sm">
        Extraction: {extractionStatus.replaceAll("_", " ")}
        {extractionError ? ` · ${extractionError}` : ""}
      </p>

      {canExtract ? (
        <form
          className="mt-3"
          action={async (formData) => {
            formData.set("documentId", documentId);
            await retryDocumentExtractionAction(formData);
          }}
        >
          <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy">Retry extraction</button>
        </form>
      ) : null}

      {suggestedDocumentType ? (
        <div className="mt-4 rounded-xl border border-line bg-ice p-3 text-sm">
          <p className="font-semibold text-navy">Suggested type</p>
          <p>
            {labelDocumentType(suggestedDocumentType)}
            {suggestedTypeConfidence != null ? ` · ${confidenceBand(suggestedTypeConfidence)} confidence` : ""}
          </p>
          <p className="text-muted">Current stored type is not changed until you accept.</p>
          {canEdit && suggestedTypeStatus === "PENDING" ? (
            <div className="mt-3 space-y-2">
              <form
                className="flex flex-wrap gap-2"
                action={async (formData) => {
                  formData.set("documentId", documentId);
                  formData.set("accept", "1");
                  formData.set("documentType", suggestedDocumentType);
                  await reviewSuggestedTypeAction(formData);
                }}
              >
                <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Accept suggested type</button>
              </form>
              <form
                className="grid gap-2 sm:grid-cols-2"
                action={async (formData) => {
                  formData.set("documentId", documentId);
                  formData.set("accept", "1");
                  await reviewSuggestedTypeAction(formData);
                }}
              >
                <select name="documentType" value={typeChoice} onChange={(event) => setTypeChoice(event.target.value)} className="rounded-lg border border-line px-3 py-2 text-sm">
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {labelDocumentType(type)}
                    </option>
                  ))}
                </select>
                <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy">
                  Choose different type
                </button>
              </form>
              <form
                action={async (formData) => {
                  formData.set("documentId", documentId);
                  await reviewSuggestedTypeAction(formData);
                }}
              >
                <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy">Ignore suggestion</button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}

      {canEdit && fields.some((field) => field.reviewStatus === "PENDING" && field.confidence >= 0.8 && !field.ambiguousDate) ? (
        <form
          className="mt-4 rounded-xl border border-line p-3 text-sm"
          action={async (formData) => {
            formData.set("documentId", documentId);
            await acceptHighConfidenceAction(formData);
          }}
        >
          <label className="flex items-start gap-2">
            <input type="checkbox" name="confirmed" value="1" required />
            I reviewed each high-confidence field still listed below.
          </label>
          <button className="mt-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Accept all high confidence</button>
        </form>
      ) : null}

      <ul className="mt-4 space-y-3">
        {fields.map((field) => {
          const band = confidenceBand(field.confidence);
          return (
            <li key={field.id} className={`rounded-xl border px-3 py-3 text-sm ${band === "Low" || field.ambiguousDate ? "border-amber-300 bg-amber-50" : "border-line"}`}>
              <p className="font-semibold text-navy">{field.displayLabel}</p>
              <p className="text-muted">
                {band} confidence · not accuracy
                {field.ambiguousDate ? " · date needs a person to confirm the format" : ""}
              </p>
              <p>Extracted: {field.rawValue}</p>
              <p>Proposed: {field.proposedValue}</p>
              {field.sourcePage ? <p className="text-muted">Source page {field.sourcePage}</p> : null}
              <p className="text-muted">Review: {field.reviewStatus}</p>
              {canEdit && field.reviewStatus === "PENDING" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <form
                    action={async (formData) => {
                      formData.set("fieldId", field.id);
                      formData.set("documentId", documentId);
                      formData.set("action", "ACCEPT");
                      await reviewFieldAction(formData);
                    }}
                  >
                    <button className="rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white">Accept</button>
                  </form>
                  <form
                    className="flex flex-wrap gap-2"
                    action={async (formData) => {
                      formData.set("fieldId", field.id);
                      formData.set("documentId", documentId);
                      formData.set("action", "EDIT");
                      await reviewFieldAction(formData);
                    }}
                  >
                    <label className="sr-only" htmlFor={`edit-${field.id}`}>
                      Edited value for {field.displayLabel}
                    </label>
                    <input id={`edit-${field.id}`} name="value" defaultValue={field.proposedValue} className="rounded-lg border border-line px-2 py-1 text-xs" />
                    <button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy">Edit and accept</button>
                  </form>
                  <form
                    action={async (formData) => {
                      formData.set("fieldId", field.id);
                      formData.set("documentId", documentId);
                      formData.set("action", "IGNORE");
                      await reviewFieldAction(formData);
                    }}
                  >
                    <button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy">Ignore</button>
                  </form>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
