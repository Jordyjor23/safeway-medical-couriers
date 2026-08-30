export const DEFAULT_SCAN_MAX_PAGES = 20;
export const SCAN_WORK_MAX_EDGE = 1600;
export const SCAN_PREVIEW_MAX_EDGE = 720;
export const SCAN_JPEG_QUALITY = 0.82;
export const SCAN_JPEG_QUALITY_STEPS = [0.82, 0.68, 0.55, 0.42];
export const SCAN_INSET_FALLBACK = 0.04;

export const CAMERA_DENIED_MESSAGE =
  "Camera access was denied. You can still Take Photo, Choose Existing Photo, or Choose File.";
export const CAMERA_UNAVAILABLE_MESSAGE =
  "The camera is not available on this device. Use Take Photo, Choose Existing Photo, or Choose File.";
export const SCANNER_UNSUPPORTED_MESSAGE =
  "Advanced scanning is not supported in this browser. Use Take Photo, Choose Existing Photo, or Choose File.";
export const SCAN_TOO_LARGE_MESSAGE =
  "The scanned PDF is larger than the upload limit. Reduce image quality or remove pages. Pages were not discarded automatically.";
export const PDF_GENERATION_FAILED_MESSAGE = "The scanned pages could not be assembled into a PDF. Try again or use Choose File.";
export const EDGE_DETECTION_FALLBACK_MESSAGE =
  "The page edges could not be detected automatically. Drag the corners to match the document, then continue.";
