import { get, put } from "@vercel/blob";
import { documentMaxBytes, documentSignedUrlSeconds } from "@/lib/documents/types";
import { validateDocumentFile, type FileValidationResult } from "@/lib/documents/validate";

export class DocumentStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentStorageError";
  }
}

function blobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new DocumentStorageError("Document storage is not configured.");
  }
  return token;
}

export function isPrivateStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function storePrivateFile(file: File) {
  if (file.size > documentMaxBytes()) {
    throw new DocumentStorageError(`The file exceeds the ${Math.floor(documentMaxBytes() / (1024 * 1024))} MB limit.`);
  }

  const validation = await validateDocumentFile(file);
  if (!validation.ok) {
    throw new DocumentStorageError(validation.error);
  }

  const token = blobToken();
  const storageKey = `private/${crypto.randomUUID()}/${validation.storedFileName}`;
  const result = await put(storageKey, file, {
    access: "private",
    token,
    contentType: validation.mimeType,
    addRandomSuffix: false,
  });

  return {
    blobKey: result.pathname,
    storedFileName: validation.storedFileName,
    originalFileName: validation.displayName,
    mimeType: validation.mimeType,
    sizeBytes: validation.sizeBytes,
    contentSha256: validation.contentSha256,
    kind: validation.kind,
  };
}

export async function readPrivateFile(blobKey: string) {
  const token = blobToken();
  const result = await get(blobKey, { access: "private", token, useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new DocumentStorageError("The stored file could not be read.");
  }
  return result;
}

/** Signed URLs are minted only after authorization and are never stored. */
export function signedUrlTtlSeconds() {
  return documentSignedUrlSeconds();
}

export function isDuplicateHashWarning(existingCount: number) {
  return existingCount > 0;
}

export type StoredFileValidation = Extract<FileValidationResult, { ok: true }>;
