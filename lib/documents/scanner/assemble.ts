import { DEFAULT_DOCUMENT_MAX_BYTES } from "@/lib/documents/types";
import { SCAN_JPEG_QUALITY_STEPS, SCAN_TOO_LARGE_MESSAGE } from "@/lib/documents/scanner/constants";
import { assembleJpegPagesToPdf, jpegDimensions, nextJpegQuality, pdfExceedsLimit } from "@/lib/documents/scanner/pdf";
import type { ScanPage } from "@/lib/documents/scanner/pages";

export type AssembleResult =
  | { ok: true; bytes: Uint8Array; quality: number }
  | { ok: false; error: string; tooLarge: true; bytes: Uint8Array; quality: number };

export function assembleScanPdf(
  pages: Pick<ScanPage, "jpeg" | "width" | "height">[],
  options: { maxBytes?: number; quality?: number } = {},
): AssembleResult {
  const maxBytes = options.maxBytes ?? DEFAULT_DOCUMENT_MAX_BYTES;
  const quality = options.quality ?? SCAN_JPEG_QUALITY_STEPS[0];
  const jpegPages = pages.map((page) => {
    const size = jpegDimensions(page.jpeg);
    return {
      jpeg: page.jpeg,
      width: size?.width ?? page.width,
      height: size?.height ?? page.height,
    };
  });
  const bytes = assembleJpegPagesToPdf(jpegPages);
  if (pdfExceedsLimit(bytes, maxBytes)) {
    return { ok: false, error: SCAN_TOO_LARGE_MESSAGE, tooLarge: true, bytes, quality };
  }
  return { ok: true, bytes, quality };
}

export function lowerScanQuality(quality: number) {
  return nextJpegQuality(quality, SCAN_JPEG_QUALITY_STEPS);
}

export function scannedPdfFile(bytes: Uint8Array, name = "scanned-document.pdf") {
  const copy = bytes.slice();
  return new File([copy], name, { type: "application/pdf" });
}

export function scannerDoesNotRunOcr() {
  return true;
}
