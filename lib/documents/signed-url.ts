import { createHmac, timingSafeEqual } from "node:crypto";
import { documentSignedUrlSeconds } from "@/lib/documents/types";

const TOKEN_VERSION = "v1";

function secret() {
  return process.env.BETTER_AUTH_SECRET || process.env.DOCUMENT_SIGNING_SECRET || "";
}

export function createDocumentAccessToken(input: {
  documentId: string;
  userId: string;
  action?: "download" | "view";
  ttlSeconds?: number;
}) {
  const key = secret();
  if (!key) return null;
  const exp = Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? documentSignedUrlSeconds());
  const action = input.action ?? "download";
  const payload = `${TOKEN_VERSION}.${input.documentId}.${input.userId}.${action}.${exp}`;
  const signature = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyDocumentAccessToken(token: string | null | undefined): {
  documentId: string;
  userId: string;
  action: "download" | "view";
} | null {
  if (!token) return null;
  const key = secret();
  if (!key) return null;
  const parts = token.split(".");
  if (parts.length !== 6) return null;
  const [version, documentId, userId, action, expRaw, signature] = parts;
  if (version !== TOKEN_VERSION || (action !== "download" && action !== "view")) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const payload = `${version}.${documentId}.${userId}.${action}.${expRaw}`;
  const expected = createHmac("sha256", key).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return { documentId, userId, action };
}

export function documentSignedFilePath(documentId: string, token: string) {
  return `/api/portal/documents/${documentId}/file?token=${encodeURIComponent(token)}`;
}
