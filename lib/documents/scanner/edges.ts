import { SCAN_INSET_FALLBACK } from "@/lib/documents/scanner/constants";
import { insetQuad, orderCorners, type PixelBuffer, type Quad } from "@/lib/documents/scanner/geometry";

export type EdgeDetectionResult = {
  quad: Quad;
  confidence: number;
  method: "auto" | "fallback";
};

function luma(buffer: PixelBuffer, x: number, y: number) {
  const i = (y * buffer.width + x) * 4;
  return 0.299 * (buffer.data[i] ?? 0) + 0.587 * (buffer.data[i + 1] ?? 0) + 0.114 * (buffer.data[i + 2] ?? 0);
}

function gradientAt(buffer: PixelBuffer, x: number, y: number) {
  const left = luma(buffer, Math.max(0, x - 1), y);
  const right = luma(buffer, Math.min(buffer.width - 1, x + 1), y);
  const up = luma(buffer, x, Math.max(0, y - 1));
  const down = luma(buffer, x, Math.min(buffer.height - 1, y + 1));
  return Math.abs(right - left) + Math.abs(down - up);
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function edgePosition(values: number[], fromStart: boolean) {
  const threshold = Math.max(18, median(values) * 1.8);
  if (fromStart) {
    for (let i = 0; i < values.length; i += 1) {
      if ((values[i] ?? 0) >= threshold) return i;
    }
    return null;
  }
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if ((values[i] ?? 0) >= threshold) return i;
  }
  return null;
}

/** Finds a likely document rectangle. Always returns a quad; low confidence means the user must adjust. */
export function detectDocumentQuad(buffer: PixelBuffer): EdgeDetectionResult {
  if (buffer.width < 8 || buffer.height < 8) {
    return { quad: insetQuad(buffer.width, buffer.height, SCAN_INSET_FALLBACK), confidence: 0, method: "fallback" };
  }

  const colEnergy = new Array(buffer.width).fill(0);
  const rowEnergy = new Array(buffer.height).fill(0);
  const stepX = Math.max(1, Math.floor(buffer.width / 240));
  const stepY = Math.max(1, Math.floor(buffer.height / 240));
  for (let y = 1; y < buffer.height - 1; y += stepY) {
    for (let x = 1; x < buffer.width - 1; x += stepX) {
      const mag = gradientAt(buffer, x, y);
      colEnergy[x] += mag;
      rowEnergy[y] += mag;
    }
  }

  const left = edgePosition(colEnergy, true);
  const right = edgePosition(colEnergy, false);
  const top = edgePosition(rowEnergy, true);
  const bottom = edgePosition(rowEnergy, false);
  if (left == null || right == null || top == null || bottom == null) {
    return { quad: insetQuad(buffer.width, buffer.height, SCAN_INSET_FALLBACK), confidence: 0, method: "fallback" };
  }
  const width = right - left;
  const height = bottom - top;
  const areaRatio = (width * height) / (buffer.width * buffer.height);
  const valid = width > buffer.width * 0.35 && height > buffer.height * 0.35 && areaRatio < 0.98 && areaRatio > 0.12;

  if (!valid) {
    return { quad: insetQuad(buffer.width, buffer.height, SCAN_INSET_FALLBACK), confidence: 0, method: "fallback" };
  }

  const quad = orderCorners([
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ]);
  const confidence = Math.min(1, Math.max(0.2, areaRatio));
  return { quad, confidence, method: "auto" };
}
