import { timingSafeEqual } from "node:crypto";

/** Read a server env var without Next.js build-time inlining of a static `process.env.NAME`. */
export function readServerEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function secretsEqual(left: string, right: string) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
