import { encryptSecret } from "@/lib/crypto";

export function isExtractionRawTextEncryptionReady() {
  const value = process.env.DATA_ENCRYPTION_KEY;
  if (!value) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

export function persistExtractionRawText(text: string | null | undefined) {
  if (!text) return null;
  if (process.env.NODE_ENV === "production") {
    if (!isExtractionRawTextEncryptionReady()) return null;
    return encryptSecret(text);
  }
  return text;
}
