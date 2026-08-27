import { put } from "@vercel/blob";

export async function storePrivateFile(filename: string, file: File | Blob) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("Document storage is not configured.");
  }

  const result = await put(`private/${crypto.randomUUID()}/${filename}`, file, {
    access: "private",
    token,
  });

  return {
    blobKey: result.pathname,
    url: result.url,
  };
}

export function isPrivateStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
