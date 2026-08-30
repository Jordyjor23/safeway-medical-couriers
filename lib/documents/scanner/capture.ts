import { SCAN_WORK_MAX_EDGE } from "@/lib/documents/scanner/constants";
import { applyColorMode, scaleBuffer, type ColorMode } from "@/lib/documents/scanner/enhance";
import type { PixelBuffer, Quad } from "@/lib/documents/scanner/geometry";
import { warpPerspective } from "@/lib/documents/scanner/geometry";

export function pixelBufferFromImageData(image: ImageData): PixelBuffer {
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
}

export function captureVideoFrame(video: HTMLVideoElement): PixelBuffer {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1;
  canvas.height = video.videoHeight || 1;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("capture");
  context.drawImage(video, 0, 0);
  return pixelBufferFromImageData(context.getImageData(0, 0, canvas.width, canvas.height));
}

export async function encodeJpeg(buffer: PixelBuffer, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = buffer.width;
  canvas.height = buffer.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("encode");
  const imageData = context.createImageData(buffer.width, buffer.height);
  imageData.data.set(buffer.data);
  context.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => (next ? resolve(next) : reject(new Error("encode"))), "image/jpeg", quality);
  });
  return new Uint8Array(await blob.arrayBuffer());
}

export function previewUrlFromJpeg(jpeg: Uint8Array) {
  return URL.createObjectURL(new Blob([jpeg.slice()], { type: "image/jpeg" }));
}

export function correctedPage(buffer: PixelBuffer, quad: Quad, mode: ColorMode) {
  const working = scaleBuffer(buffer, SCAN_WORK_MAX_EDGE);
  const scaleX = working.width / buffer.width;
  const scaleY = working.height / buffer.height;
  const scaledQuad: Quad = {
    tl: { x: quad.tl.x * scaleX, y: quad.tl.y * scaleY },
    tr: { x: quad.tr.x * scaleX, y: quad.tr.y * scaleY },
    br: { x: quad.br.x * scaleX, y: quad.br.y * scaleY },
    bl: { x: quad.bl.x * scaleX, y: quad.bl.y * scaleY },
  };
  return applyColorMode(warpPerspective(working, scaledQuad), mode);
}
