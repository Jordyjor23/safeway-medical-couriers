import { createHash } from "node:crypto";
import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  REJECTED_DOCUMENT_EXTENSIONS,
  documentMaxBytes,
  fileExtension,
} from "@/lib/documents/types";

export type ValidatedDocumentKind = "pdf" | "jpeg" | "png" | "heic" | "docx";

export type FileValidationResult =
  | {
      ok: true;
      kind: ValidatedDocumentKind;
      mimeType: string;
      extension: string;
      sizeBytes: number;
      displayName: string;
      storedFileName: string;
      contentSha256: string;
    }
  | { ok: false; error: string };

const KIND_MIME: Record<ValidatedDocumentKind, string> = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function bytesStartWith(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function asciiAt(bytes: Uint8Array, offset: number, length: number) {
  return Buffer.from(bytes.subarray(offset, offset + length)).toString("ascii");
}

function detectKind(bytes: Uint8Array): ValidatedDocumentKind | null {
  if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf";
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (bytes.length >= 12 && asciiAt(bytes, 4, 4) === "ftyp") {
    const brand = asciiAt(bytes, 8, 4).toLowerCase();
    if (["heic", "heix", "heif", "mif1"].includes(brand)) return "heic";
  }
  if (bytesStartWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || bytesStartWith(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    if (looksLikeDocx(bytes)) return "docx";
    return null;
  }
  return null;
}

function looksLikeDocx(bytes: Uint8Array) {
  const sample = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 131072))).toString("latin1");
  const hasContentTypes = sample.includes("[Content_Types].xml");
  const hasWord = sample.includes("word/document.xml") || sample.includes("word/");
  return hasContentTypes && hasWord && !isOfficeImpostor(sample);
}

function isOfficeImpostor(sample: string) {
  return sample.includes("xl/workbook") || sample.includes("ppt/slides");
}

function isRejectedSignature(bytes: Uint8Array) {
  if (bytesStartWith(bytes, [0x4d, 0x5a])) return true;
  if (bytesStartWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) return true;
  const head = asciiAt(bytes, 0, Math.min(bytes.length, 32)).toLowerCase();
  if (head.includes("<html") || head.includes("<!doctype") || head.includes("<svg") || head.includes("<?xml")) {
    return true;
  }
  return false;
}

export function sanitizeDisplayFilename(filename: string) {
  const base = filename.split(/[/\\]/).pop() ?? "document";
  return base.replace(/[^\w.\- ()]+/g, "_").slice(0, 180) || "document";
}

export function sanitizeStoredFilename(filename: string) {
  const display = sanitizeDisplayFilename(filename);
  const ext = fileExtension(display);
  const stem = display.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "document";
  return ext ? `${stem}.${ext}` : stem;
}

export function hashFileBuffer(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function extensionMatchesKind(extension: string, kind: ValidatedDocumentKind) {
  if (kind === "pdf") return extension === "pdf";
  if (kind === "jpeg") return extension === "jpg" || extension === "jpeg";
  if (kind === "png") return extension === "png";
  if (kind === "heic") return extension === "heic" || extension === "heif";
  if (kind === "docx") return extension === "docx";
  return false;
}

export function validateDocumentBytes(input: {
  filename: string;
  claimedType?: string | null;
  sizeBytes: number;
  bytes: Uint8Array;
  maxBytes?: number;
}): FileValidationResult {
  const maxBytes = input.maxBytes ?? documentMaxBytes();
  if (!input.sizeBytes || input.sizeBytes <= 0) {
    return { ok: false, error: "The file is empty." };
  }
  if (input.sizeBytes > maxBytes) {
    return { ok: false, error: `The file exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit.` };
  }
  if (input.bytes.length < 8) {
    return { ok: false, error: "The file is too small to be a valid document." };
  }

  const extension = fileExtension(input.filename);
  if ((REJECTED_DOCUMENT_EXTENSIONS as readonly string[]).includes(extension)) {
    return { ok: false, error: "That file type is not allowed." };
  }
  if (!(ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(extension)) {
    return { ok: false, error: "Upload a PDF, JPEG, PNG, HEIC, or DOCX file." };
  }
  if (isRejectedSignature(input.bytes)) {
    return { ok: false, error: "That file type is not allowed." };
  }

  const kind = detectKind(input.bytes);
  if (!kind) {
    return { ok: false, error: "The file contents do not match a supported document type." };
  }
  if (!extensionMatchesKind(extension, kind)) {
    return { ok: false, error: "The file extension does not match the file contents." };
  }
  if (kind === "docx" && !extensionMatchesKind(extension, "docx")) {
    return { ok: false, error: "ZIP archives other than DOCX are not allowed." };
  }

  const claimed = (input.claimedType ?? "").toLowerCase();
  if (claimed && claimed !== "application/octet-stream") {
    const expected = KIND_MIME[kind];
    const jpegAlias = kind === "jpeg" && (claimed === "image/jpg" || claimed === "image/jpeg");
    const heicAlias = kind === "heic" && (claimed === "image/heic" || claimed === "image/heif");
    if (!jpegAlias && !heicAlias && claimed !== expected) {
      return { ok: false, error: "The reported file type does not match the file contents." };
    }
  }

  const displayName = sanitizeDisplayFilename(input.filename);
  return {
    ok: true,
    kind,
    mimeType: KIND_MIME[kind],
    extension,
    sizeBytes: input.sizeBytes,
    displayName,
    storedFileName: sanitizeStoredFilename(displayName),
    contentSha256: hashFileBuffer(input.bytes),
  };
}

export async function validateDocumentFile(file: File): Promise<FileValidationResult> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  return validateDocumentBytes({
    filename: file.name,
    claimedType: file.type,
    sizeBytes: file.size,
    bytes: buffer,
  });
}
