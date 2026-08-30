export type Point = { x: number; y: number };
export type Quad = { tl: Point; tr: Point; br: Point; bl: Point };

export function orderCorners(points: Point[]): Quad {
  const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return { tl: top[0] ?? points[0], tr: top[1] ?? points[1], br: bottom[1] ?? points[2], bl: bottom[0] ?? points[3] };
}

export function insetQuad(width: number, height: number, inset = 0.04): Quad {
  const x = width * inset;
  const y = height * inset;
  return {
    tl: { x, y },
    tr: { x: width - x, y },
    br: { x: width - x, y: height - y },
    bl: { x, y: height - y },
  };
}

export function scaleQuad(quad: Quad, scaleX: number, scaleY: number): Quad {
  return {
    tl: { x: quad.tl.x * scaleX, y: quad.tl.y * scaleY },
    tr: { x: quad.tr.x * scaleX, y: quad.tr.y * scaleY },
    br: { x: quad.br.x * scaleX, y: quad.br.y * scaleY },
    bl: { x: quad.bl.x * scaleX, y: quad.bl.y * scaleY },
  };
}

export function clampQuad(quad: Quad, width: number, height: number): Quad {
  const clamp = (point: Point) => ({
    x: Math.min(width - 1, Math.max(0, point.x)),
    y: Math.min(height - 1, Math.max(0, point.y)),
  });
  return { tl: clamp(quad.tl), tr: clamp(quad.tr), br: clamp(quad.br), bl: clamp(quad.bl) };
}

export function quadWidth(quad: Quad) {
  return Math.max(distance(quad.tl, quad.tr), distance(quad.bl, quad.br));
}

export function quadHeight(quad: Quad) {
  return Math.max(distance(quad.tl, quad.bl), distance(quad.tr, quad.br));
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Maps a point in the destination rectangle onto the source quad. Stays inside the selected corners. */
export function mapRectToQuad(quad: Quad, width: number, height: number, x: number, y: number): Point {
  const u = width <= 1 ? 0 : x / (width - 1);
  const v = height <= 1 ? 0 : y / (height - 1);
  const top = lerp(quad.tl, quad.tr, u);
  const bottom = lerp(quad.bl, quad.br, u);
  return lerp(top, bottom, v);
}

export type PixelBuffer = { width: number; height: number; data: Uint8ClampedArray };

export function sampleBilinear(buffer: PixelBuffer, x: number, y: number): [number, number, number, number] {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(buffer.width - 1, x0 + 1);
  const y1 = Math.min(buffer.height - 1, y0 + 1);
  const sx = x - x0;
  const sy = y - y0;
  const p00 = pixelAt(buffer, x0, y0);
  const p10 = pixelAt(buffer, x1, y0);
  const p01 = pixelAt(buffer, x0, y1);
  const p11 = pixelAt(buffer, x1, y1);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return [
    mix(mix(p00[0], p10[0], sx), mix(p01[0], p11[0], sx), sy),
    mix(mix(p00[1], p10[1], sx), mix(p01[1], p11[1], sx), sy),
    mix(mix(p00[2], p10[2], sx), mix(p01[2], p11[2], sx), sy),
    255,
  ];
}

function pixelAt(buffer: PixelBuffer, x: number, y: number): [number, number, number, number] {
  const i = (y * buffer.width + x) * 4;
  return [buffer.data[i] ?? 0, buffer.data[i + 1] ?? 0, buffer.data[i + 2] ?? 0, buffer.data[i + 3] ?? 255];
}

export function warpPerspective(source: PixelBuffer, quad: Quad, destWidth?: number, destHeight?: number): PixelBuffer {
  const width = destWidth != null ? Math.max(1, Math.round(destWidth)) : Math.max(32, Math.round(quadWidth(quad)));
  const height = destHeight != null ? Math.max(1, Math.round(destHeight)) : Math.max(32, Math.round(quadHeight(quad)));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = mapRectToQuad(quad, width, height, x, y);
      const sx = Math.min(source.width - 1, Math.max(0, src.x));
      const sy = Math.min(source.height - 1, Math.max(0, src.y));
      const [r, g, b, a] = sampleBilinear(source, sx, sy);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { width, height, data };
}

export function rotateBuffer90(buffer: PixelBuffer): PixelBuffer {
  const width = buffer.height;
  const height = buffer.width;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      const nx = buffer.height - 1 - y;
      const ny = x;
      const si = (y * buffer.width + x) * 4;
      const di = (ny * width + nx) * 4;
      data[di] = buffer.data[si] ?? 0;
      data[di + 1] = buffer.data[si + 1] ?? 0;
      data[di + 2] = buffer.data[si + 2] ?? 0;
      data[di + 3] = buffer.data[si + 3] ?? 255;
    }
  }
  return { width, height, data };
}

export function reorderItems<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

export function removeItem<T>(items: T[], index: number) {
  return items.filter((_, current) => current !== index);
}
