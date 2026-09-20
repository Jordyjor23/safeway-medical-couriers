import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AUTH_SECRET_BUILD_PLACEHOLDER,
  AUTH_SECRET_MIN_LENGTH,
  assertRuntimeAuthSecret,
  isWeakBetterAuthSecret,
  resolveBetterAuthSecret,
} from "@/lib/auth-secret";
import {
  OWNER_BOOTSTRAP_ALREADY_PROVISIONED_MESSAGE,
  OWNER_BOOTSTRAP_DISABLED_MESSAGE,
  allowOwnerBootstrapSignup,
  ownerSetupIsAvailable,
} from "@/lib/owner-bootstrap";
import { secretsEqual } from "@/lib/secrets";

const KEYS = ["BETTER_AUTH_SECRET", "NEXT_PHASE"] as const;
const previous: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

function snapshotEnv() {
  for (const key of KEYS) previous[key] = process.env[key];
}

afterEach(() => {
  for (const key of KEYS) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

describe("BETTER_AUTH_SECRET hardening", () => {
  it("rejects missing, short, and known placeholder secrets", () => {
    expect(isWeakBetterAuthSecret("")).toBe(true);
    expect(isWeakBetterAuthSecret("short-secret")).toBe(true);
    expect(isWeakBetterAuthSecret(AUTH_SECRET_BUILD_PLACEHOLDER)).toBe(true);
    expect(isWeakBetterAuthSecret("a".repeat(AUTH_SECRET_MIN_LENGTH))).toBe(false);
  });

  it("allows production build compilation without a live secret but not runtime", () => {
    snapshotEnv();
    delete process.env.BETTER_AUTH_SECRET;
    process.env.NEXT_PHASE = "phase-production-build";
    expect(resolveBetterAuthSecret()).toBe(AUTH_SECRET_BUILD_PLACEHOLDER);
    expect(() => assertRuntimeAuthSecret()).not.toThrow();

    delete process.env.NEXT_PHASE;
    expect(() => assertRuntimeAuthSecret()).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("accepts a strong runtime secret", () => {
    snapshotEnv();
    delete process.env.NEXT_PHASE;
    process.env.BETTER_AUTH_SECRET = "A".repeat(32) + "/runtime-secret+value";
    expect(resolveBetterAuthSecret()).toBe(process.env.BETTER_AUTH_SECRET);
    expect(() => assertRuntimeAuthSecret()).not.toThrow();
  });
});

describe("owner bootstrap hardening", () => {
  it("is available only before an owner exists", () => {
    expect(ownerSetupIsAvailable({ ownerCount: 0, setupSecretConfigured: true })).toBe(true);
    expect(ownerSetupIsAvailable({ ownerCount: 1, setupSecretConfigured: true })).toBe(false);
    expect(ownerSetupIsAvailable({ ownerCount: 0, setupSecretConfigured: false })).toBe(false);
  });

  it("rejects signup after an owner exists even with the correct setup secret", () => {
    expect(
      allowOwnerBootstrapSignup({
        setupSecret: "bootstrap-secret-value",
        setupHeader: "bootstrap-secret-value",
        ownerCount: 1,
      }),
    ).toEqual({ ok: false, message: OWNER_BOOTSTRAP_ALREADY_PROVISIONED_MESSAGE });
  });

  it("requires a matching setup secret for the first owner", () => {
    expect(
      allowOwnerBootstrapSignup({
        setupSecret: "bootstrap-secret-value",
        setupHeader: "wrong",
        ownerCount: 0,
      }),
    ).toEqual({ ok: false, message: OWNER_BOOTSTRAP_DISABLED_MESSAGE });

    expect(
      allowOwnerBootstrapSignup({
        setupSecret: "bootstrap-secret-value",
        setupHeader: "bootstrap-secret-value",
        ownerCount: 0,
      }),
    ).toEqual({ ok: true });
  });

  it("removes the internal x-staff-create signup bypass and owner password recovery path", () => {
    const authSource = readFileSync(resolve(process.cwd(), "lib/auth.ts"), "utf8");
    const setupSource = readFileSync(resolve(process.cwd(), "app/(auth)/setup/actions.ts"), "utf8");
    expect(authSource).not.toContain("x-staff-create");
    expect(authSource).not.toContain("staffHeader");
    expect(setupSource).not.toContain("owner.password.recovered");
  });

  it("compares setup secrets in constant time and rejects empty values", () => {
    expect(secretsEqual("abc", "abc")).toBe(true);
    expect(secretsEqual("abc", "abd")).toBe(false);
    expect(secretsEqual("", "")).toBe(false);
  });
});
