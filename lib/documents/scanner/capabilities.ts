export type ScannerCapabilities = {
  canScan: boolean;
  getUserMedia: boolean;
  secureContext: boolean;
  reason: "ok" | "unsupported" | "insecure" | "no-media";
};

export function detectScannerCapabilities(
  env: {
    isSecureContext?: boolean;
    protocol?: string;
    hostname?: string;
    mediaDevices?: { getUserMedia?: unknown } | null;
  } = typeof globalThis !== "undefined"
    ? {
        isSecureContext: (globalThis as { isSecureContext?: boolean }).isSecureContext,
        protocol: typeof location !== "undefined" ? location.protocol : undefined,
        hostname: typeof location !== "undefined" ? location.hostname : undefined,
        mediaDevices: typeof navigator !== "undefined" ? navigator.mediaDevices : null,
      }
    : {},
): ScannerCapabilities {
  const secure =
    env.isSecureContext === true ||
    env.protocol === "https:" ||
    env.hostname === "localhost" ||
    env.hostname === "127.0.0.1";
  const getUserMedia = typeof env.mediaDevices?.getUserMedia === "function";
  if (!getUserMedia) {
    return { canScan: false, getUserMedia: false, secureContext: secure, reason: "no-media" };
  }
  if (!secure) {
    return { canScan: false, getUserMedia: true, secureContext: false, reason: "insecure" };
  }
  return { canScan: true, getUserMedia: true, secureContext: true, reason: "ok" };
}

export function scannerUnsupportedReason(capabilities: ScannerCapabilities) {
  if (capabilities.reason === "insecure") return "unsupported";
  if (capabilities.reason === "no-media") return "unsupported";
  return capabilities.reason;
}
