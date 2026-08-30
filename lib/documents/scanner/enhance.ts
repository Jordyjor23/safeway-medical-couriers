import type { PixelBuffer } from "@/lib/documents/scanner/geometry";

export type ColorMode = "color" | "grayscale" | "bw";

export function applyColorMode(buffer: PixelBuffer, mode: ColorMode): PixelBuffer {
  if (mode === "color") return mildSharpen(mildContrast(buffer));
  const data = new Uint8ClampedArray(buffer.data);
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
    if (mode === "bw") {
      // Keep mid-grays so faint printed text is not crushed to white.
      const value = gray < 18 ? 0 : gray > 96 ? 255 : gray;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    } else {
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  }
  const converted = { width: buffer.width, height: buffer.height, data };
  return mode === "bw" ? converted : mildSharpen(converted);
}

function mildContrast(buffer: PixelBuffer): PixelBuffer {
  let min = 255;
  let max = 0;
  for (let i = 0; i < buffer.data.length; i += 4) {
    const gray = 0.299 * (buffer.data[i] ?? 0) + 0.587 * (buffer.data[i + 1] ?? 0) + 0.114 * (buffer.data[i + 2] ?? 0);
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }
  const span = Math.max(1, max - min);
  const data = new Uint8ClampedArray(buffer.data);
  const gain = Math.min(1.25, 255 / span);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp((data[i] - min) * gain);
    data[i + 1] = clamp((data[i + 1] - min) * gain);
    data[i + 2] = clamp((data[i + 2] - min) * gain);
  }
  return { width: buffer.width, height: buffer.height, data };
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, value));
}

/** Light unsharp only. Does not threshold ink, stamps, or signatures away. */
function mildSharpen(buffer: PixelBuffer): PixelBuffer {
  const { width, height, data } = buffer;
  const out = new Uint8ClampedArray(data);
  const amount = 0.22;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const center = data[i + c] ?? 0;
        const neighbor =
          ((data[i - width * 4 + c] ?? 0) +
            (data[i + width * 4 + c] ?? 0) +
            (data[i - 4 + c] ?? 0) +
            (data[i + 4 + c] ?? 0)) /
          4;
        out[i + c] = clamp(center + (center - neighbor) * amount);
      }
    }
  }
  return { width, height, data: out };
}

export function scaleBuffer(buffer: PixelBuffer, maxEdge: number): PixelBuffer {
  const longest = Math.max(buffer.width, buffer.height);
  if (longest <= maxEdge) return buffer;
  const scale = maxEdge / longest;
  const width = Math.max(1, Math.round(buffer.width * scale));
  const height = Math.max(1, Math.round(buffer.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(buffer.width - 1, Math.floor((x / width) * buffer.width));
      const sy = Math.min(buffer.height - 1, Math.floor((y / height) * buffer.height));
      const si = (sy * buffer.width + sx) * 4;
      const di = (y * width + x) * 4;
      data[di] = buffer.data[si] ?? 0;
      data[di + 1] = buffer.data[si + 1] ?? 0;
      data[di + 2] = buffer.data[si + 2] ?? 0;
      data[di + 3] = buffer.data[si + 3] ?? 255;
    }
  }
  return { width, height, data };
}
