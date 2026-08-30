"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  CAMERA_DENIED_MESSAGE,
  CAMERA_UNAVAILABLE_MESSAGE,
  DEFAULT_SCAN_MAX_PAGES,
  EDGE_DETECTION_FALLBACK_MESSAGE,
  PDF_GENERATION_FAILED_MESSAGE,
  SCAN_JPEG_QUALITY,
  SCAN_PREVIEW_MAX_EDGE,
  SCAN_TOO_LARGE_MESSAGE,
  SCANNER_UNSUPPORTED_MESSAGE,
} from "@/lib/documents/scanner/constants";
import { detectScannerCapabilities } from "@/lib/documents/scanner/capabilities";
import { detectDocumentQuad } from "@/lib/documents/scanner/edges";
import { scaleBuffer, type ColorMode } from "@/lib/documents/scanner/enhance";
import { clampQuad, insetQuad, rotateBuffer90, type PixelBuffer, type Quad } from "@/lib/documents/scanner/geometry";
import { assembleScanPdf, lowerScanQuality, scannedPdfFile } from "@/lib/documents/scanner/assemble";
import {
  addScanPage,
  canAddPage,
  cleanupScanPages,
  deleteScanPage,
  reorderScanPages,
  replaceScanPage,
  type ScanPage,
} from "@/lib/documents/scanner/pages";
import { captureVideoFrame, correctedPage, encodeJpeg, previewUrlFromJpeg } from "@/lib/documents/scanner/capture";
import { DEFAULT_DOCUMENT_MAX_BYTES } from "@/lib/documents/types";

const buttonNavy = "rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const buttonLine = "rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy";

export function DocumentScanner({
  onComplete,
  onCancel,
}: {
  onComplete: (file: File) => void;
  onCancel: () => void;
}) {
  const capabilities = detectScannerCapabilities();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureRef = useRef<PixelBuffer | null>(null);
  const [stage, setStage] = useState<"camera" | "crop" | "preview" | "pages" | "working" | "too-large">("camera");
  const [error, setError] = useState<string | null>(capabilities.canScan ? null : SCANNER_UNSUPPORTED_MESSAGE);
  const [busy, setBusy] = useState("");
  const [torch, setTorch] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [autoFailed, setAutoFailed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<ColorMode>("color");
  const [quality, setQuality] = useState(SCAN_JPEG_QUALITY);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [capturePreview, setCapturePreview] = useState<string | null>(null);
  const [captureSize, setCaptureSize] = useState<{ width: number; height: number } | null>(null);
  const [corrected, setCorrected] = useState<PixelBuffer | null>(null);

  useEffect(() => {
    if (!capabilities.canScan || stage !== "camera") return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          await video.play();
        }
        const track = stream.getVideoTracks()[0];
        const capabilitiesForTrack = track?.getCapabilities?.() as { torch?: boolean } | undefined;
        setTorchAvailable(Boolean(capabilitiesForTrack?.torch));
      } catch (caught) {
        const name = caught instanceof DOMException ? caught.name : "";
        setError(name === "NotAllowedError" ? CAMERA_DENIED_MESSAGE : CAMERA_UNAVAILABLE_MESSAGE);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [capabilities.canScan, stage]);

  useEffect(() => {
    return () => {
      cleanupScanPages(pages);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (capturePreview) URL.revokeObjectURL(capturePreview);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // Unmount-only cleanup of live camera and object URLs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setTorch(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("The camera could not capture a page. Try again or use Take Photo.");
      return;
    }
    try {
      const buffer = captureVideoFrame(video);
      captureRef.current = buffer;
      setCaptureSize({ width: buffer.width, height: buffer.height });
      const detected = detectDocumentQuad(buffer);
      setQuad(clampQuad(detected.quad, buffer.width, buffer.height));
      setAutoFailed(detected.method === "fallback");
      if (capturePreview) URL.revokeObjectURL(capturePreview);
      const previewJpeg = await encodeJpeg(scaleBuffer(buffer, SCAN_PREVIEW_MAX_EDGE), 0.6);
      setCapturePreview(previewUrlFromJpeg(previewJpeg));
      stopCamera();
      setStage("crop");
      setError(detected.method === "fallback" ? EDGE_DETECTION_FALLBACK_MESSAGE : null);
    } catch {
      setError("The camera could not capture a page. Try again or use Take Photo.");
    }
  }

  function resetCrop() {
    const buffer = captureRef.current;
    if (!buffer) return;
    setQuad(insetQuad(buffer.width, buffer.height));
    setAutoFailed(true);
  }

  function autoDetect() {
    const buffer = captureRef.current;
    if (!buffer) return;
    const detected = detectDocumentQuad(buffer);
    setQuad(clampQuad(detected.quad, buffer.width, buffer.height));
    setAutoFailed(detected.method === "fallback");
    setError(detected.method === "fallback" ? EDGE_DETECTION_FALLBACK_MESSAGE : null);
  }

  function manualAdjust() {
    setAutoFailed(true);
    setError(null);
  }

  async function acceptCrop() {
    const buffer = captureRef.current;
    if (!buffer || !quad) return;
    setBusy("Correcting page…");
    setStage("working");
    try {
      await new Promise((resolve) => setTimeout(resolve, 10));
      const next = correctedPage(buffer, quad, mode);
      setCorrected(next);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const jpeg = await encodeJpeg(next, quality);
      setPreviewUrl(previewUrlFromJpeg(jpeg));
      setStage("preview");
    } catch {
      setError("The page could not be corrected. Adjust the corners or use Take Photo.");
      setStage("crop");
    } finally {
      setBusy("");
    }
  }

  async function applyMode(nextMode: ColorMode) {
    const buffer = captureRef.current;
    if (!buffer || !quad) return;
    setMode(nextMode);
    setBusy("Updating preview…");
    try {
      const next = correctedPage(buffer, quad, nextMode);
      setCorrected(next);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(previewUrlFromJpeg(await encodeJpeg(next, quality)));
    } finally {
      setBusy("");
    }
  }

  async function acceptPage() {
    // Encode the already-corrected preview buffer. Do not re-apply color conversion.
    if (!corrected) return;
    const jpeg = await encodeJpeg(corrected, quality);
    const page: ScanPage = {
      id: crypto.randomUUID(),
      jpeg,
      width: corrected.width,
      height: corrected.height,
      previewUrl: previewUrlFromJpeg(jpeg),
    };
    setPages((current) => {
      if (retakeIndex != null) return replaceScanPage(current, retakeIndex, page);
      return addScanPage(current, page);
    });
    setRetakeIndex(null);
    setStage("pages");
    setCorrected(null);
  }

  async function rotate(index: number) {
    const page = pages[index];
    if (!page) return;
    const canvas = document.createElement("canvas");
    const blob = new Blob([page.jpeg.slice()], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(bitmap, 0, 0);
    const buffer = rotateBuffer90({
      width: canvas.width,
      height: canvas.height,
      data: new Uint8ClampedArray(context.getImageData(0, 0, canvas.width, canvas.height).data),
    });
    const jpeg = await encodeJpeg(buffer, quality);
    if (page.previewUrl) URL.revokeObjectURL(page.previewUrl);
    setPages(replaceScanPage(pages, index, { ...page, jpeg, width: buffer.width, height: buffer.height, previewUrl: previewUrlFromJpeg(jpeg) }));
  }

  async function finish(nextQuality = quality) {
    if (!pages.length) return;
    setBusy("Building PDF…");
    setStage("working");
    try {
      const result = assembleScanPdf(pages, { maxBytes: DEFAULT_DOCUMENT_MAX_BYTES, quality: nextQuality });
      if (!result.ok) {
        setQuality(nextQuality);
        setStage("too-large");
        setError(SCAN_TOO_LARGE_MESSAGE);
        return;
      }
      cleanupScanPages(pages);
      onComplete(scannedPdfFile(result.bytes, "scanned-document.pdf"));
    } catch {
      setError(PDF_GENERATION_FAILED_MESSAGE);
      setStage("pages");
    } finally {
      setBusy("");
    }
  }

  async function reduceQuality() {
    const next = lowerScanQuality(quality);
    if (next == null) {
      setError(SCAN_TOO_LARGE_MESSAGE);
      setStage("pages");
      return;
    }
    const rebuilt: ScanPage[] = [];
    for (const page of pages) {
      const blob = new Blob([page.jpeg.slice()], { type: "image/jpeg" });
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.drawImage(bitmap, 0, 0);
      const jpeg = await encodeJpeg(
        { width: canvas.width, height: canvas.height, data: new Uint8ClampedArray(context.getImageData(0, 0, canvas.width, canvas.height).data) },
        next,
      );
      if (page.previewUrl) URL.revokeObjectURL(page.previewUrl);
      rebuilt.push({ ...page, jpeg, previewUrl: previewUrlFromJpeg(jpeg) });
    }
    setPages(rebuilt);
    setQuality(next);
    await finish(next);
  }

  function close() {
    cleanupScanPages(pages);
    stopCamera();
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="scan-document-title">
      <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Scan document</p>
            <h2 id="scan-document-title" className="mt-1 text-xl font-semibold text-navy">
              Scan with camera
            </h2>
          </div>
          <button type="button" className="text-sm font-semibold text-muted hover:text-navy" onClick={close}>
            Cancel
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">Scanning stays on this device. You can still Take Photo or Choose File instead.</p>

        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {busy ? (
          <p className="mt-3 text-sm text-navy" aria-live="polite">
            {busy}
          </p>
        ) : null}

        {stage === "camera" && capabilities.canScan ? (
          <div className="mt-4 space-y-3">
            <video ref={videoRef} className="aspect-[3/4] w-full rounded-xl bg-black object-cover" playsInline muted autoPlay />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonNavy} onClick={() => void capture()}>
                Capture page
              </button>
              {torchAvailable ? (
                <button type="button" className={buttonLine} onClick={() => void toggleTorch()} aria-pressed={torch}>
                  {torch ? "Torch off" : "Torch on"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {stage === "crop" && capturePreview && quad && captureSize ? (
          <CropEditor
            imageSrc={capturePreview}
            width={captureSize.width}
            height={captureSize.height}
            quad={quad}
            onChange={setQuad}
            onAuto={autoDetect}
            onReset={resetCrop}
            onManual={manualAdjust}
            onContinue={() => void acceptCrop()}
            autoFailed={autoFailed}
          />
        ) : null}

        {stage === "preview" && previewUrl ? (
          <div className="mt-4 space-y-3">
            <img src={previewUrl} alt="Corrected page preview" className="max-h-80 w-full rounded-xl object-contain bg-ice" />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Color mode">
              {(["color", "grayscale", "bw"] as const).map((item) => (
                <button key={item} type="button" className={mode === item ? buttonNavy : buttonLine} onClick={() => void applyMode(item)}>
                  {item === "color" ? "Original / Color" : item === "grayscale" ? "Grayscale" : "Black & White"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonNavy} onClick={() => void acceptPage()}>
                Keep page
              </button>
              <button type="button" className={buttonLine} onClick={() => { setStage("camera"); setError(null); }}>
                Retake
              </button>
            </div>
          </div>
        ) : null}

        {stage === "pages" ? (
          <div className="mt-4 space-y-3">
            <ul className="grid grid-cols-3 gap-2">
              {pages.map((page, index) => (
                <li key={page.id} className="rounded-xl border border-line p-2">
                  {page.previewUrl ? <img src={page.previewUrl} alt={`Page ${index + 1}`} className="h-24 w-full object-contain" /> : null}
                  <p className="mt-1 text-xs text-muted">Page {index + 1}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <button type="button" className="text-xs font-semibold text-navy" onClick={() => setPages(reorderScanPages(pages, index, Math.max(0, index - 1)))}>
                      Up
                    </button>
                    <button type="button" className="text-xs font-semibold text-navy" onClick={() => setPages(reorderScanPages(pages, index, Math.min(pages.length - 1, index + 1)))}>
                      Down
                    </button>
                    <button type="button" className="text-xs font-semibold text-navy" onClick={() => void rotate(index)}>
                      Rotate
                    </button>
                    <button type="button" className="text-xs font-semibold text-navy" onClick={() => { setRetakeIndex(index); setStage("camera"); }}>
                      Retake
                    </button>
                    <button type="button" className="text-xs font-semibold text-navy" onClick={() => setPages(deleteScanPage(pages, index))}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {canAddPage(pages.length, DEFAULT_SCAN_MAX_PAGES) ? (
                <button type="button" className={buttonLine} onClick={() => { setRetakeIndex(null); setStage("camera"); }}>
                  Add page
                </button>
              ) : (
                <p className="text-sm text-muted">Maximum {DEFAULT_SCAN_MAX_PAGES} pages.</p>
              )}
              <button type="button" className={buttonNavy} disabled={!pages.length} onClick={() => void finish()}>
                Use scanned PDF
              </button>
            </div>
          </div>
        ) : null}

        {stage === "too-large" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={buttonNavy} onClick={() => void reduceQuality()}>
              Reduce image quality
            </button>
            <button type="button" className={buttonLine} onClick={() => setStage("pages")}>
              Remove pages
            </button>
            <button type="button" className={buttonLine} onClick={close}>
              Cancel
            </button>
          </div>
        ) : null}

        <button type="button" className="mt-4 text-sm font-semibold text-medical hover:underline" onClick={close}>
          Use Take Photo or Choose File instead
        </button>
      </div>
    </div>
  );
}

function CropEditor({
  imageSrc,
  width,
  height,
  quad,
  onChange,
  onAuto,
  onReset,
  onManual,
  onContinue,
  autoFailed,
}: {
  imageSrc: string;
  width: number;
  height: number;
  quad: Quad;
  onChange: (quad: Quad) => void;
  onAuto: () => void;
  onReset: () => void;
  onManual: () => void;
  onContinue: () => void;
  autoFailed: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  function move(corner: keyof Quad, event: ReactPointerEvent<HTMLButtonElement>) {
    const box = boxRef.current;
    if (!box) return;
    event.preventDefault();
    const rect = box.getBoundingClientRect();
    const update = (clientX: number, clientY: number) => {
      const x = ((clientX - rect.left) / rect.width) * width;
      const y = ((clientY - rect.top) / rect.height) * height;
      onChange(clampQuad({ ...quad, [corner]: { x, y } }, width, height));
    };
    update(event.clientX, event.clientY);
    const movePoint = (next: PointerEvent) => update(next.clientX, next.clientY);
    const up = () => {
      window.removeEventListener("pointermove", movePoint);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", movePoint);
    window.addEventListener("pointerup", up);
  }

  const points: [keyof Quad, string][] = [
    ["tl", "Top left"],
    ["tr", "Top right"],
    ["br", "Bottom right"],
    ["bl", "Bottom left"],
  ];

  return (
    <div className="mt-4 space-y-3">
      <div ref={boxRef} className="relative overflow-hidden rounded-xl bg-black">
        <img src={imageSrc} alt="Captured page" className="block w-full" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <polygon
            points={`${pct(quad.tl.x, width)},${pct(quad.tl.y, height)} ${pct(quad.tr.x, width)},${pct(quad.tr.y, height)} ${pct(quad.br.x, width)},${pct(quad.br.y, height)} ${pct(quad.bl.x, width)},${pct(quad.bl.y, height)}`}
            fill="none"
            stroke="white"
            strokeWidth="2"
          />
        </svg>
        {points.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-label={`Adjust ${label} corner`}
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-navy"
            style={{ left: `${pct(quad[key].x, width)}%`, top: `${pct(quad[key].y, height)}%` }}
            onPointerDown={(event) => move(key, event)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonLine} onClick={onAuto}>
          Auto detect
        </button>
        <button type="button" className={buttonLine} onClick={onReset}>
          Reset
        </button>
        <button type="button" className={buttonLine} onClick={onManual}>
          Manual Adjust
        </button>
        <button type="button" className={buttonNavy} onClick={onContinue}>
          Continue
        </button>
      </div>
      <p className="text-sm text-muted">
        {autoFailed
          ? "Automatic edges were not trusted. Drag each corner to match the document. The crop is not applied until you continue."
          : "Drag the corners if the outline is wrong. The crop is not applied until you continue."}
      </p>
    </div>
  );
}

function pct(value: number, total: number) {
  return total ? (value / total) * 100 : 0;
}
