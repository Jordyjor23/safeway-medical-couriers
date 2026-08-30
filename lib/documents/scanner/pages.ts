import { DEFAULT_SCAN_MAX_PAGES } from "@/lib/documents/scanner/constants";
import { removeItem, reorderItems } from "@/lib/documents/scanner/geometry";

export type ScanPage = {
  id: string;
  jpeg: Uint8Array;
  width: number;
  height: number;
  previewUrl: string | null;
};

export function canAddPage(count: number, maxPages = DEFAULT_SCAN_MAX_PAGES) {
  return count < maxPages;
}

export function addScanPage(pages: ScanPage[], page: ScanPage, maxPages = DEFAULT_SCAN_MAX_PAGES) {
  if (!canAddPage(pages.length, maxPages)) return pages;
  return [...pages, page];
}

export function replaceScanPage(pages: ScanPage[], index: number, page: ScanPage) {
  return pages.map((current, currentIndex) => (currentIndex === index ? page : current));
}

export function deleteScanPage(pages: ScanPage[], index: number) {
  const removed = pages[index];
  if (removed?.previewUrl) revokePreview(removed.previewUrl);
  return removeItem(pages, index);
}

export function reorderScanPages(pages: ScanPage[], from: number, to: number) {
  return reorderItems(pages, from, to);
}

export function cleanupScanPages(pages: ScanPage[]) {
  for (const page of pages) {
    if (page.previewUrl) revokePreview(page.previewUrl);
  }
}

export function revokePreview(url: string) {
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

export function handoffScannedFile(file: File, currentName: string) {
  const base = currentName.trim() || file.name.replace(/\.[^.]+$/, "");
  return { file, name: base };
}
