import { BLOCKED_FIELD_KEYS } from "@/lib/documents/extraction/types";

export function isBlockedFieldKey(key: string) {
  const normalized = key.replace(/[^a-zA-Z]/g, "").toLowerCase();
  return BLOCKED_FIELD_KEYS.some((blocked) => blocked.replace(/[^a-zA-Z]/g, "").toLowerCase() === normalized);
}

export function looksLikeBlockedValue(value: string) {
  const compact = value.replace(/[\s-]/g, "");
  if (/^\d{9}$/.test(compact) && /ssn|social/i.test(value)) return true;
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(value)) return true;
  return false;
}

export function sanitizeExtractedText(text: string) {
  return text.slice(0, 50_000);
}
