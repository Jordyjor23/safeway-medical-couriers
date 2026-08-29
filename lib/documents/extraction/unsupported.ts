export const MANUAL_EXTRACTION_MESSAGE =
  "Automatic extraction is unavailable for this format. You can still enter metadata manually.";

export function isExtractionUnsupportedFormat(mimeType?: string | null, filename?: string | null) {
  const mime = (mimeType ?? "").toLowerCase();
  const name = (filename ?? "").toLowerCase();
  return (
    mime.includes("heic") ||
    mime.includes("heif") ||
    mime.includes("wordprocessingml") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    name.endsWith(".docx")
  );
}

export function extractionManualEntryNotice(args: {
  extractionStatus?: string | null;
  extractionError?: string | null;
  mimeType?: string | null;
  filename?: string | null;
}) {
  if (args.extractionStatus === "NOT_APPLICABLE") return MANUAL_EXTRACTION_MESSAGE;
  if (args.extractionError === MANUAL_EXTRACTION_MESSAGE) return MANUAL_EXTRACTION_MESSAGE;
  if (isExtractionUnsupportedFormat(args.mimeType, args.filename)) return MANUAL_EXTRACTION_MESSAGE;
  return null;
}
