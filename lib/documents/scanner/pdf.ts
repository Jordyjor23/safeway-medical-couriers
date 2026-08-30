export type JpegPage = { jpeg: Uint8Array; width: number; height: number };

export function jpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = ((bytes[offset + 2] ?? 0) << 8) + (bytes[offset + 3] ?? 0);
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return {
        height: ((bytes[offset + 5] ?? 0) << 8) + (bytes[offset + 6] ?? 0),
        width: ((bytes[offset + 7] ?? 0) << 8) + (bytes[offset + 8] ?? 0),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function ascii(value: string) {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

function concatBytes(chunks: Uint8Array[]) {
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Assemble JPEG pages into a PDF locally. Does not decode pixels or call a remote service. */
export function assembleJpegPagesToPdf(pages: JpegPage[]): Uint8Array {
  if (!pages.length) throw new Error("No pages to assemble.");

  const chunks: Uint8Array[] = [ascii("%PDF-1.4\n")];
  const xref: number[] = [0];

  function offset() {
    return chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  }
  function obj(number: number, body: Uint8Array) {
    xref[number] = offset();
    chunks.push(ascii(`${number} 0 obj\n`), body, ascii("\nendobj\n"));
  }

  const pageNumbers = pages.map((_, index) => 3 + index * 3);
  obj(1, ascii("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, ascii(`<< /Type /Pages /Kids [${pageNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>`));

  pages.forEach((page, index) => {
    const pageNum = 3 + index * 3;
    const contentNum = pageNum + 1;
    const imageNum = pageNum + 2;
    const draw = `q ${page.width} 0 0 ${page.height} 0 0 cm /Im0 Do Q`;
    obj(
      pageNum,
      ascii(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /XObject << /Im0 ${imageNum} 0 R >> >> /Contents ${contentNum} 0 R >>`,
      ),
    );
    obj(contentNum, ascii(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
    obj(
      imageNum,
      concatBytes([
        ascii(
          `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
        ),
        page.jpeg,
        ascii("\nendstream"),
      ]),
    );
  });

  const startxref = offset();
  const xrefCount = 3 + pages.length * 3;
  let table = `xref\n0 ${xrefCount}\n0000000000 65535 f \n`;
  for (let i = 1; i < xrefCount; i += 1) {
    table += `${String(xref[i] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(ascii(table), ascii(`trailer\n<< /Size ${xrefCount} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`));
  return concatBytes(chunks);
}

export function pdfExceedsLimit(bytes: Uint8Array, maxBytes: number) {
  return bytes.length > maxBytes;
}

export function nextJpegQuality(current: number, steps: number[]) {
  const nextIndex = steps.findIndex((step) => step < current - 0.001);
  return nextIndex >= 0 ? (steps[nextIndex] ?? null) : null;
}
