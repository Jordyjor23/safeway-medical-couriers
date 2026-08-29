export type DateParseResult =
  | { ok: true; iso: string; ambiguous: false }
  | { ok: true; iso: string; ambiguous: true; raw: string }
  | { ok: false; raw: string; ambiguous: true };

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const US_OR_EU = /^(\d{1,2})[/=-](\d{1,2})[/=-](\d{4})$/;

export function normalizeProposedDate(raw: string): DateParseResult {
  const value = raw.trim();
  const iso = value.match(ISO);
  if (iso) {
    return { ok: true, iso: `${iso[1]}-${iso[2]}-${iso[3]}`, ambiguous: false };
  }
  const slash = value.match(US_OR_EU);
  if (!slash) return { ok: false, raw: value, ambiguous: true };
  const a = Number(slash[1]);
  const b = Number(slash[2]);
  const year = slash[3];
  if (a > 12 && b <= 12) {
    return { ok: true, iso: `${year}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`, ambiguous: false };
  }
  if (b > 12 && a <= 12) {
    return { ok: true, iso: `${year}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`, ambiguous: false };
  }
  if (a <= 12 && b <= 12) {
    return {
      ok: true,
      iso: `${year}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`,
      ambiguous: true,
      raw: value,
    };
  }
  return { ok: false, raw: value, ambiguous: true };
}

export function normalizeVin(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function normalizeState(value: string) {
  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return trimmed;
}

export function normalizePolicyNumber(value: string) {
  return value.trim();
}

export function confidenceBand(confidence: number): "High" | "Medium" | "Low" {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

export const HIGH_CONFIDENCE_MIN = 0.8;
