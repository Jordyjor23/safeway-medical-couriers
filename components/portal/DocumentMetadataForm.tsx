"use client";

import { updateDocumentMetadataAction } from "@/app/(portal)/dashboard/documents/actions";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  TYPES_BY_CATEGORY,
  labelDocumentType,
} from "@/lib/documents/catalog";
import { isoDateInput } from "@/lib/documents/display";
import type { DocumentCategory } from "@prisma/client";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 focus:border-medical focus:ring-2";

export function DocumentMetadataForm({
  document,
}: {
  document: {
    id: string;
    name: string;
    category: DocumentCategory;
    documentType: string | null;
    effectiveDate: Date | null;
    expirationDate: Date | null;
    notes: string | null;
    isSensitive: boolean;
  };
}) {
  const types = TYPES_BY_CATEGORY[document.category] ?? ["OTHER"];
  return (
    <form
      action={async (formData) => {
        await updateDocumentMetadataAction(formData);
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="documentId" value={document.id} />
      <label className="text-sm font-semibold text-navy">
        Display name
        <input name="name" defaultValue={document.name} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy">
        Category
        <select name="category" defaultValue={document.category} className={fieldClass}>
          {DOCUMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {DOCUMENT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Document type
        <select name="documentType" defaultValue={document.documentType ?? ""} className={fieldClass}>
          <option value="">None</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {labelDocumentType(type)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Effective / issue date
        <input name="effectiveDate" type="date" defaultValue={isoDateInput(document.effectiveDate)} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy">
        Expiration date
        <input name="expirationDate" type="date" defaultValue={isoDateInput(document.expirationDate)} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Notes
        <textarea name="notes" rows={3} defaultValue={document.notes ?? ""} className={fieldClass} />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-navy sm:col-span-2">
        <input name="isSensitive" type="checkbox" value="1" defaultChecked={document.isSensitive} />
        Sensitive document
      </label>
      <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Save metadata</button>
    </form>
  );
}
