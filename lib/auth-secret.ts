import { readServerEnv } from "@/lib/secrets";

export const AUTH_SECRET_BUILD_PLACEHOLDER = "unconfigured-local-secret-not-for-production-use";
export const AUTH_SECRET_MIN_LENGTH = 32;

const WEAK_SECRETS = new Set(
  [
    AUTH_SECRET_BUILD_PLACEHOLDER,
    "secret",
    "changeme",
    "password",
    "test",
    "better-auth-secret",
  ].map((value) => value.toLowerCase()),
);

export function isNextProductionBuild() {
  return readServerEnv("NEXT_PHASE") === "phase-production-build";
}

export function isWeakBetterAuthSecret(secret: string) {
  if (secret.length < AUTH_SECRET_MIN_LENGTH) return true;
  if (WEAK_SECRETS.has(secret.toLowerCase())) return true;
  return false;
}

export function readBetterAuthSecret() {
  return readServerEnv("BETTER_AUTH_SECRET");
}

/**
 * Build may use a placeholder so `next build` can compile without a live secret.
 * Runtime (including Production) must never sign sessions with a missing or weak value.
 */
export function resolveBetterAuthSecret() {
  const secret = readBetterAuthSecret();
  if (!isWeakBetterAuthSecret(secret)) return secret;
  if (isNextProductionBuild()) return AUTH_SECRET_BUILD_PLACEHOLDER;
  throw new Error(
    "BETTER_AUTH_SECRET is missing or too weak. Generate one with: openssl rand -base64 32",
  );
}

export function assertRuntimeAuthSecret() {
  if (isNextProductionBuild()) return;
  const secret = readBetterAuthSecret();
  if (isWeakBetterAuthSecret(secret)) {
    throw new Error(
      "BETTER_AUTH_SECRET is missing or too weak. Generate one with: openssl rand -base64 32",
    );
  }
}
