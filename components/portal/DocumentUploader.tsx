"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchDocumentAssociations } from "@/app/(portal)/dashboard/documents/actions";
import {
  DOCUMENT_CAPTURE,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  DUPLICATE_FILE_WARNING,
  SCAN_DOCUMENT_LABEL,
  TYPES_BY_CATEGORY,
  labelDocumentType,
} from "@/lib/documents/catalog";
import { ALLOWED_DOCUMENT_EXTENSIONS, DEFAULT_DOCUMENT_MAX_BYTES, fileExtension } from "@/lib/documents/types";
import { DocumentScanner } from "@/components/portal/DocumentScanner";
import { detectScannerCapabilities } from "@/lib/documents/scanner/capabilities";
import type { DocumentCategory } from "@prisma/client";

type AssociationOption = { id: string; label: string };

type Preset = {
  employeeId?: string;
  employeeLabel?: string;
  customerId?: string;
  customerLabel?: string;
  contractId?: string;
  contractLabel?: string;
  deliveryId?: string;
  deliveryLabel?: string;
  supersedesId?: string;
  category?: DocumentCategory;
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 focus:border-medical focus:ring-2";

export function DocumentUploader({
  associations,
  preset,
  triggerLabel = "Upload Document",
  detailBasePath = "/dashboard/documents",
}: {
  associations: { employee: boolean; customer: boolean; contract: boolean; delivery: boolean };
  preset?: Preset;
  triggerLabel?: string;
  detailBasePath?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>(preset?.category ?? "EMPLOYEE_DOCUMENTS");
  const [documentType, setDocumentType] = useState("");
  const [name, setName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSensitive, setIsSensitive] = useState(false);
  const [employeeId, setEmployeeId] = useState(preset?.employeeId ?? "");
  const [customerId, setCustomerId] = useState(preset?.customerId ?? "");
  const [contractId, setContractId] = useState(preset?.contractId ?? "");
  const [deliveryId, setDeliveryId] = useState(preset?.deliveryId ?? "");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<{ id: string; name: string; uploadedAt: string }[] | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const canScan = detectScannerCapabilities().canScan;
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const types = TYPES_BY_CATEGORY[category] ?? ["OTHER"];

  function reset() {
    setStep(1);
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
    setDuplicates(null);
    setName("");
    setNotes("");
    setEffectiveDate("");
    setExpirationDate("");
    setIsSensitive(false);
    setDocumentType("");
    setCategory(preset?.category ?? "EMPLOYEE_DOCUMENTS");
    setEmployeeId(preset?.employeeId ?? "");
    setCustomerId(preset?.customerId ?? "");
    setContractId(preset?.contractId ?? "");
    setDeliveryId(preset?.deliveryId ?? "");
    setScanOpen(false);
    if (fileRef.current) fileRef.current.value = "";
    if (photoRef.current) photoRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  function onFiles(list: FileList | null) {
    const next = list?.[0];
    if (!next) return;
    const extension = fileExtension(next.name);
    if (!(ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(extension)) {
      setError("Upload a PDF, JPEG, PNG, HEIC, or DOCX file.");
      return;
    }
    if (next.size > DEFAULT_DOCUMENT_MAX_BYTES) {
      setError(`The file exceeds the ${Math.floor(DEFAULT_DOCUMENT_MAX_BYTES / (1024 * 1024))} MB limit.`);
      return;
    }
    setFile(next);
    if (!name) setName(next.name.replace(/\.[^.]+$/, ""));
    setError(null);
  }

  async function submit(allowDuplicate = false) {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setStatus("uploading");
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("name", name || file.name);
    body.set("category", category);
    if (documentType) body.set("documentType", documentType);
    if (effectiveDate) body.set("effectiveDate", effectiveDate);
    if (expirationDate) body.set("expirationDate", expirationDate);
    if (notes) body.set("notes", notes);
    if (isSensitive) body.set("isSensitive", "1");
    if (employeeId) body.set("employeeId", employeeId);
    if (customerId) body.set("customerId", customerId);
    if (contractId) body.set("contractId", contractId);
    if (deliveryId) body.set("deliveryId", deliveryId);
    if (preset?.supersedesId) body.set("supersedesId", preset.supersedesId);
    if (allowDuplicate) body.set("allowDuplicate", "1");

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/portal/documents");
      xhr.withCredentials = true;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        try {
          const payload = JSON.parse(xhr.responseText) as {
            ok?: boolean;
            documentId?: string;
            error?: string;
            duplicate?: boolean;
            matches?: { id: string; name: string; uploadedAt: string }[];
          };
          if (xhr.status === 409 && payload.duplicate) {
            setDuplicates(payload.matches ?? []);
            setStatus("idle");
            resolve();
            return;
          }
          if (!xhr.status.toString().startsWith("2") || payload.error) {
            setError(payload.error || "The document could not be uploaded. Try again.");
            setStatus("error");
            resolve();
            return;
          }
          setStatus("success");
          setProgress(100);
          router.refresh();
          if (payload.documentId) router.push(`${detailBasePath}/${payload.documentId}`);
        } catch {
          setError("The document could not be uploaded. Try again.");
          setStatus("error");
        }
        resolve();
      };
      xhr.onerror = () => {
        setError("The upload was interrupted. Check your connection and retry.");
        setStatus("error");
        resolve();
      };
      xhr.send(body);
    });
  }

  const review = useMemo(
    () => [
      ["File", file?.name ?? "—"],
      ["Category", DOCUMENT_CATEGORY_LABELS[category]],
      ["Type", documentType ? labelDocumentType(documentType) : "—"],
      ["Display name", name || file?.name || "—"],
      ["Effective", effectiveDate || "—"],
      ["Expiration", expirationDate || "—"],
    ],
    [file, category, documentType, name, effectiveDate, expirationDate],
  );

  if (!open) {
    return (
      <button
        type="button"
        className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-medical"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <>
      {scanOpen ? (
        <DocumentScanner
          onComplete={(next) => {
            setFile(next);
            setName((current) => current || next.name.replace(/\.[^.]+$/, ""));
            setScanOpen(false);
            setError(null);
          }}
          onCancel={() => setScanOpen(false)}
        />
      ) : null}
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="upload-document-title">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Step {step} of 6</p>
            <h2 id="upload-document-title" className="mt-1 text-xl font-semibold text-navy">
              {preset?.supersedesId ? "Upload replacement" : "Upload document"}
            </h2>
          </div>
          <button type="button" className="text-sm font-semibold text-muted hover:text-navy" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>

        {step === 1 ? (
          <div className="mt-5 space-y-4">
            <div
              className={`rounded-2xl border border-dashed px-4 py-10 text-center ${dragOver ? "border-medical bg-ice" : "border-line"}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                onFiles(event.dataTransfer.files);
              }}
            >
              <p className="font-semibold text-navy">Drag and drop a file</p>
              <p className="mt-1 text-sm text-muted">PDF, JPG, PNG, HEIC, or DOCX. One file at a time.</p>
              {file ? <p className="mt-3 text-sm text-navy">{file.name}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canScan ? (
                <button type="button" className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white" onClick={() => setScanOpen(true)}>
                  {SCAN_DOCUMENT_LABEL}
                </button>
              ) : null}
              <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy" onClick={() => cameraRef.current?.click()} aria-controls="document-camera">
                Take Photo
              </button>
              <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy" onClick={() => photoRef.current?.click()} aria-controls="document-photo">
                Choose Existing Photo
              </button>
              <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy" onClick={() => fileRef.current?.click()} aria-controls="document-file">
                Choose File
              </button>
            </div>
            <input id="document-file" ref={fileRef} type="file" accept={DOCUMENT_CAPTURE.file.accept} className="sr-only" onChange={(event) => onFiles(event.target.files)} />
            <input id="document-photo" ref={photoRef} type="file" accept={DOCUMENT_CAPTURE.photo.accept} className="sr-only" onChange={(event) => onFiles(event.target.files)} />
            <input
              id="document-camera"
              ref={cameraRef}
              type="file"
              accept={DOCUMENT_CAPTURE.camera.accept}
              capture={DOCUMENT_CAPTURE.camera.capture}
              className="sr-only"
              onChange={(event) => onFiles(event.target.files)}
            />
            <label htmlFor="document-file" className="sr-only">
              Choose file
            </label>
            <label htmlFor="document-photo" className="sr-only">
              Choose existing photo
            </label>
            <label htmlFor="document-camera" className="sr-only">
              Take photo
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-5 grid gap-3">
            <label className="text-sm font-semibold text-navy">
              Category
              <select className={fieldClass} value={category} onChange={(event) => { setCategory(event.target.value as DocumentCategory); setDocumentType(""); }}>
                {DOCUMENT_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {DOCUMENT_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Document type
              <select className={fieldClass} value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                <option value="">Select type</option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {labelDocumentType(type)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-5 grid gap-3">
            {preset?.employeeLabel ? <p className="text-sm text-navy">Employee: {preset.employeeLabel}</p> : null}
            {preset?.customerLabel ? <p className="text-sm text-navy">Customer: {preset.customerLabel}</p> : null}
            {preset?.contractLabel ? <p className="text-sm text-navy">Contract: {preset.contractLabel}</p> : null}
            {preset?.deliveryLabel ? <p className="text-sm text-navy">Delivery: {preset.deliveryLabel}</p> : null}
            {associations.employee && !preset?.employeeId ? (
              <AssociationSearch kind="employee" label="Employee" value={employeeId} onChange={setEmployeeId} />
            ) : null}
            {associations.customer && !preset?.customerId ? (
              <AssociationSearch kind="customer" label="Customer" value={customerId} onChange={setCustomerId} />
            ) : null}
            {associations.contract && !preset?.contractId ? (
              <AssociationSearch kind="contract" label="Contract" value={contractId} onChange={setContractId} />
            ) : null}
            {associations.delivery && !preset?.deliveryId ? (
              <AssociationSearch kind="delivery" label="Delivery" value={deliveryId} onChange={setDeliveryId} />
            ) : null}
            {!associations.employee && !associations.customer && !associations.contract && !associations.delivery && !preset ? (
              <p className="text-sm text-muted">This upload will be stored as a company document.</p>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="mt-5 grid gap-3">
            <label className="text-sm font-semibold text-navy">
              Display name
              <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Effective / issue date
              <input type="date" className={fieldClass} value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Expiration date
              <input type="date" className={fieldClass} value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Notes
              <textarea className={fieldClass} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy">
              <input type="checkbox" checked={isSensitive} onChange={(event) => setIsSensitive(event.target.checked)} />
              Sensitive document
            </label>
          </div>
        ) : null}

        {step === 5 || step === 6 ? (
          <div className="mt-5 space-y-3 text-sm">
            {review.map(([label, value]) => (
              <p key={label}>
                <span className="text-muted">{label}:</span> {value}
              </p>
            ))}
            {status === "uploading" ? (
              <p className="text-navy" aria-live="polite">
                Uploading… {progress}%
              </p>
            ) : null}
            {status === "success" ? <p className="text-navy">Saved. Opening the document…</p> : null}
            {duplicates ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
                <p className="font-semibold"> {DUPLICATE_FILE_WARNING}</p>
                <ul className="mt-2 list-disc pl-5">
                  {duplicates.map((match) => (
                    <li key={match.id}>{match.name}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {step > 1 && status !== "uploading" ? (
            <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : null}
          {step < 5 ? (
            <button
              type="button"
              className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={step === 1 && !file}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </button>
          ) : null}
          {step === 5 && !duplicates ? (
            <button type="button" className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white" onClick={() => { setStep(6); void submit(false); }}>
              Upload
            </button>
          ) : null}
          {duplicates ? (
            <>
              <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy" onClick={() => { setDuplicates(null); setStep(1); }}>
                Cancel
              </button>
              <button type="button" className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white" onClick={() => { setDuplicates(null); setStep(6); void submit(true); }}>
                Upload Anyway
              </button>
            </>
          ) : null}
          {status === "error" ? (
            <button type="button" className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white" onClick={() => void submit(Boolean(duplicates))}>
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
    </>
  );
}

function AssociationSearch({
  kind,
  label,
  value,
  onChange,
}: {
  kind: "employee" | "customer" | "contract" | "delivery";
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AssociationOption[]>([]);

  return (
    <label className="text-sm font-semibold text-navy">
      {label}
      <input
        className={fieldClass}
        value={query}
        placeholder={`Search ${label.toLowerCase()}`}
        onChange={async (event) => {
          const next = event.target.value;
          setQuery(next);
          const results = await searchDocumentAssociations(kind, next);
          setOptions(results);
        }}
      />
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">None</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
