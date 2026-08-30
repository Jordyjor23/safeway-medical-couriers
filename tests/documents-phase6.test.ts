import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DUPLICATE_FILE_WARNING, SCAN_DOCUMENT_LABEL } from "@/lib/documents/catalog";
import { validateDocumentBytes } from "@/lib/documents/validate";
import { detectScannerCapabilities } from "@/lib/documents/scanner/capabilities";
import {
  CAMERA_DENIED_MESSAGE,
  DEFAULT_SCAN_MAX_PAGES,
  SCAN_JPEG_QUALITY_STEPS,
  SCANNER_UNSUPPORTED_MESSAGE,
} from "@/lib/documents/scanner/constants";
import { detectDocumentQuad } from "@/lib/documents/scanner/edges";
import { applyColorMode } from "@/lib/documents/scanner/enhance";
import {
  insetQuad,
  mapRectToQuad,
  orderCorners,
  removeItem,
  reorderItems,
  rotateBuffer90,
  warpPerspective,
  type PixelBuffer,
} from "@/lib/documents/scanner/geometry";
import { assembleJpegPagesToPdf, jpegDimensions, nextJpegQuality } from "@/lib/documents/scanner/pdf";
import { assembleScanPdf, lowerScanQuality, scannedPdfFile, scannerDoesNotRunOcr } from "@/lib/documents/scanner/assemble";
import {
  addScanPage,
  canAddPage,
  cleanupScanPages,
  deleteScanPage,
  handoffScannedFile,
  reorderScanPages,
  replaceScanPage,
  type ScanPage,
} from "@/lib/documents/scanner/pages";
import { DEFAULT_DOCUMENT_MAX_BYTES } from "@/lib/documents/types";

function tinyJpeg(width: number, height: number) {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x01, 0x01, 0x11, 0x00, 0xff, 0xd9,
  ]);
}

function page(id: string): ScanPage {
  const jpeg = tinyJpeg(8, 8);
  return { id, jpeg, width: 8, height: 8, previewUrl: null };
}

function rectBuffer(width: number, height: number, inset = 8): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inside = x >= inset && x < width - inset && y >= inset && y < height - inset;
      const value = inside ? 240 : 20;
      const i = (y * width + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

describe("phase 6 scanner capability detection", () => {
  it("falls back when getUserMedia is missing", () => {
    const result = detectScannerCapabilities({ isSecureContext: true, mediaDevices: {} });
    expect(result.canScan).toBe(false);
    expect(result.reason).toBe("no-media");
    expect(SCANNER_UNSUPPORTED_MESSAGE.toLowerCase()).toContain("take photo");
  });

  it("falls back on insecure contexts", () => {
    const result = detectScannerCapabilities({
      isSecureContext: false,
      protocol: "http:",
      hostname: "example.com",
      mediaDevices: { getUserMedia: () => undefined },
    });
    expect(result.canScan).toBe(false);
    expect(result.reason).toBe("insecure");
  });

  it("enables scanning when getUserMedia exists on a secure origin", () => {
    const result = detectScannerCapabilities({
      isSecureContext: true,
      mediaDevices: { getUserMedia: () => undefined },
    });
    expect(result.canScan).toBe(true);
  });

  it("treats localhost HTTP as a secure context for development", () => {
    const result = detectScannerCapabilities({
      isSecureContext: false,
      protocol: "http:",
      hostname: "localhost",
      mediaDevices: { getUserMedia: () => undefined },
    });
    expect(result.canScan).toBe(true);
  });

  it("treats camera denial as a fallback path, not a required camera", () => {
    expect(CAMERA_DENIED_MESSAGE.toLowerCase()).toContain("choose file");
    expect(CAMERA_DENIED_MESSAGE.toLowerCase()).toContain("take photo");
  });
});

describe("phase 6 page operations", () => {
  it("adds, reorders, rotates geometry, and deletes pages", () => {
    const a = page("a");
    const b = page("b");
    const c = page("c");
    let pages = addScanPage([], a);
    pages = addScanPage(pages, b);
    pages = addScanPage(pages, c);
    expect(pages.map((item) => item.id)).toEqual(["a", "b", "c"]);
    pages = reorderScanPages(pages, 2, 0);
    expect(pages.map((item) => item.id)).toEqual(["c", "a", "b"]);
    pages = deleteScanPage(pages, 1);
    expect(pages.map((item) => item.id)).toEqual(["c", "b"]);
    expect(canAddPage(DEFAULT_SCAN_MAX_PAGES, DEFAULT_SCAN_MAX_PAGES)).toBe(false);
    expect(canAddPage(1)).toBe(true);
    expect(reorderItems(["x", "y"], 0, 1)).toEqual(["y", "x"]);
    expect(removeItem(["x", "y"], 0)).toEqual(["y"]);
    const rotated = rotateBuffer90(rectBuffer(2, 1, 0));
    expect(rotated.width).toBe(1);
    expect(rotated.height).toBe(2);
    pages = replaceScanPage(pages, 0, page("c2"));
    expect(pages[0]?.id).toBe("c2");
  });

  it("assembles a single-page PDF in capture order", () => {
    const jpeg = tinyJpeg(8, 10);
    const bytes = assembleJpegPagesToPdf([{ jpeg, width: 8, height: 10 }]);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("%PDF");
    expect(Buffer.from(bytes).toString("latin1")).toContain("/Count 1");
  });

  it("cleans up preview URLs after cancel or success", () => {
    const revoked: string[] = [];
    const original = URL.revokeObjectURL;
    URL.revokeObjectURL = (url: string) => {
      revoked.push(url);
    };
    cleanupScanPages([{ ...page("a"), previewUrl: "blob:scan-a" }]);
    URL.revokeObjectURL = original;
    expect(revoked).toContain("blob:scan-a");
  });
});

describe("phase 6 crop and perspective", () => {
  it("detects a contrasting rectangle and falls back when there is no edge", () => {
    const detected = detectDocumentQuad(rectBuffer(80, 80, 10));
    expect(detected.method).toBe("auto");
    expect(detected.quad.tl.x).toBeLessThan(20);
    const flat = rectBuffer(40, 40, 0);
    const fallback = detectDocumentQuad(flat);
    expect(fallback.method).toBe("fallback");
    expect(fallback.confidence).toBe(0);
  });

  it("maps crop corners onto the destination rectangle", () => {
    const quad = orderCorners([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    const mapped = mapRectToQuad(quad, 11, 11, 10, 10);
    expect(mapped.x).toBeCloseTo(10);
    expect(mapped.y).toBeCloseTo(10);
    const source = rectBuffer(12, 12, 2);
    const warped = warpPerspective(source, insetQuad(12, 12, 0.1), 10, 10);
    expect(warped.width).toBe(10);
    expect(warped.height).toBe(10);
  });

  it("keeps a manual inset crop instead of auto-accepting a bad outline", () => {
    const manual = insetQuad(100, 80, 0.12);
    expect(manual.tl.x).toBeCloseTo(12);
    expect(manual.br.x).toBeCloseTo(88);
    const scanner = readFileSync(path.join(process.cwd(), "components/portal/DocumentScanner.tsx"), "utf8");
    expect(scanner).toContain("Manual Adjust");
    expect(scanner).toContain("Auto detect");
    expect(scanner).toContain("Reset");
    expect(scanner).toContain("The crop is not applied until you continue");
  });
});

describe("phase 6 color modes and pdf", () => {
  it("keeps faint gray in black-and-white instead of crushing it to white", () => {
    const data = new Uint8ClampedArray([60, 60, 60, 255]);
    const result = applyColorMode({ width: 1, height: 1, data }, "bw");
    expect(result.data[0]).toBe(60);
  });

  it("assembles a PDF that still passes server validation", () => {
    const jpeg = tinyJpeg(8, 8);
    expect(jpegDimensions(jpeg)).toEqual({ width: 8, height: 8 });
    const bytes = assembleJpegPagesToPdf([
      { jpeg, width: 8, height: 8 },
      { jpeg, width: 8, height: 8 },
    ]);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("%PDF");
    const validation = validateDocumentBytes({
      filename: "scanned-document.pdf",
      claimedType: "application/pdf",
      sizeBytes: bytes.length,
      bytes,
    });
    expect(validation.ok).toBe(true);
  });

  it("does not silently drop pages when the PDF is too large", () => {
    const jpeg = tinyJpeg(8, 8);
    const result = assembleScanPdf([{ jpeg, width: 8, height: 8 }], { maxBytes: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.tooLarge).toBe(true);
    expect(lowerScanQuality(SCAN_JPEG_QUALITY_STEPS[0] ?? 0.82)).toBe(0.68);
    expect(nextJpegQuality(0.42, SCAN_JPEG_QUALITY_STEPS)).toBeNull();
  });

  it("hands the generated file back to DocumentUploader without changing associations", () => {
    const file = scannedPdfFile(assembleJpegPagesToPdf([{ jpeg: tinyJpeg(8, 8), width: 8, height: 8 }]));
    const handoff = handoffScannedFile(file, "License");
    expect(handoff.file.type).toBe("application/pdf");
    expect(handoff.name).toBe("License");
    expect(handoff.file.size).toBeLessThanOrEqual(DEFAULT_DOCUMENT_MAX_BYTES);
  });
});

describe("phase 6 security and OCR isolation", () => {
  it("does not import OCR, email, or a hosted scanner SDK", () => {
    const dir = path.join(process.cwd(), "lib/documents/scanner");
    const files = [
      "capabilities.ts",
      "edges.ts",
      "geometry.ts",
      "pdf.ts",
      "assemble.ts",
      "pages.ts",
      "constants.ts",
      "capture.ts",
      "enhance.ts",
    ];
    const joined = files.map((file) => readFileSync(path.join(dir, file), "utf8")).join("\n");
    expect(joined).not.toContain("startDocumentExtraction");
    expect(joined).not.toContain("documentintelligence");
    expect(joined).not.toContain("dynamsoft");
    expect(joined).not.toContain("scanbot");
    expect(joined).not.toContain("NEXT_PUBLIC_BLOB");
    expect(scannerDoesNotRunOcr()).toBe(true);
    const pkg = readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    expect(pkg).not.toContain("pdf-lib");
    expect(pkg).not.toContain("jspdf");
    expect(pkg).not.toContain("dynamsoft");
    expect(pkg).not.toContain("scanbot");
    expect(pkg).not.toContain("jscanify");
  });

  it("keeps Take Photo fallback labels and Scan Document copy", () => {
    expect(SCAN_DOCUMENT_LABEL).toBe("Scan Document");
    const uploader = readFileSync(path.join(process.cwd(), "components/portal/DocumentUploader.tsx"), "utf8");
    expect(uploader).toContain("SCAN_DOCUMENT_LABEL");
    expect(uploader).toContain("Take Photo");
    expect(uploader).toContain("Choose Existing Photo");
    expect(uploader).toContain("Choose File");
    expect(uploader).toContain("/api/portal/documents");
  });
});

describe("phase 6 DocumentUploader integration", () => {
  const uploader = readFileSync(path.join(process.cwd(), "components/portal/DocumentUploader.tsx"), "utf8");
  const scanner = readFileSync(path.join(process.cwd(), "components/portal/DocumentScanner.tsx"), "utf8");

  it("returns a fragment so the scanner overlay can sit beside the wizard", () => {
    expect(uploader).toContain("return (");
    expect(uploader).toContain("<>");
    expect(uploader).toContain("</>");
    expect(uploader).toContain("scanOpen");
    expect(uploader).toContain("const fileRef = useRef");
    expect(uploader).toContain("ref={fileRef}");
  });

  it("restores documentType and other wizard state on reset", () => {
    expect(uploader).toMatch(/function reset\(\)[\s\S]*setDocumentType\(""\)/);
    expect(uploader).toMatch(/function reset\(\)[\s\S]*setCategory\(preset\?\.category/);
    expect(uploader).toMatch(/function reset\(\)[\s\S]*setEmployeeId\(preset\?\.employeeId/);
    expect(uploader).toMatch(/function reset\(\)[\s\S]*fileRef\.current/);
  });

  it("reserves navy for Scan Document and keeps Take Photo as an outline fallback", () => {
    expect(uploader).toMatch(/bg-navy[\s\S]{0,180}\{SCAN_DOCUMENT_LABEL\}/);
    expect(uploader).toMatch(/border border-line[\s\S]{0,160}Take Photo/);
    const scanGate = uploader.indexOf("{canScan ?");
    const takePhoto = uploader.indexOf("Take Photo");
    expect(scanGate).toBeGreaterThan(0);
    expect(takePhoto).toBeGreaterThan(scanGate);
  });

  it("hands the scanned File into the existing wizard without clearing associations or supersedesId", () => {
    expect(uploader).toContain("setFile(next)");
    expect(uploader).toContain('body.set("employeeId", employeeId)');
    expect(uploader).toContain('body.set("customerId", customerId)');
    expect(uploader).toContain('body.set("contractId", contractId)');
    expect(uploader).toContain('body.set("deliveryId", deliveryId)');
    expect(uploader).toContain("preset?.supersedesId");
    expect(uploader).toContain("Upload replacement");
    expect(uploader).not.toMatch(/onComplete=\{\(next\) => \{[\s\S]{0,400}setEmployeeId/);
    expect(uploader).not.toMatch(/onComplete=\{\(next\) => \{[\s\S]{0,400}setSupersedes/);
  });

  it("still shows the duplicate SHA-256 warning and Upload Anyway path", () => {
    expect(DUPLICATE_FILE_WARNING).toBe("This file appears to already exist.");
    expect(uploader).toContain("DUPLICATE_FILE_WARNING");
    expect(uploader).toContain("Upload Anyway");
    expect(uploader).toContain("allowDuplicate");
  });

  it("keeps server validation on the existing upload route", () => {
    expect(uploader).toContain('xhr.open("POST", "/api/portal/documents")');
    expect(uploader).toContain("DEFAULT_DOCUMENT_MAX_BYTES");
    expect(uploader).toContain("ALLOWED_DOCUMENT_EXTENSIONS");
  });

  it("does not invoke OCR from the scanner UI", () => {
    expect(scanner).not.toContain("startDocumentExtraction");
    expect(scanner).not.toContain("applyColorMode");
    expect(scanner).toContain("correctedPage");
    expect(scanner).toContain("encodeJpeg(corrected");
    expect(scanner).toContain("torchAvailable");
    expect(scanner).toMatch(/const \[torch, setTorch\]/);
    expect(scanner).toContain("Reduce image quality");
    expect(scanner).toContain("Remove pages");
    expect(scanner).toContain("Use Take Photo or Choose File instead");
  });

  it("always keeps the mobile capture fallbacks even when Scan Document is gated", () => {
    expect(uploader).toContain("document-camera");
    expect(uploader).toContain("document-photo");
    expect(uploader).toContain("document-file");
    expect(uploader).toContain("DOCUMENT_CAPTURE.camera");
    expect(scanner).toContain("cleanupScanPages(pages)");
  });
});
