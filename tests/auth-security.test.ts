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
import { isPasswordChangePath, isTwoFactorSetupPath } from "@/lib/request-path";
import { secretsEqual } from "@/lib/secrets";

const KEYS = ["BETTER_AUTH_SECRET", "NEXT_PHASE"] as const;

describe("BETTER_AUTH_SECRET", () => {
  const previous: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  function snapshotEnv() {
    for (const key of KEYS) previous[key] = process.env[key];
  }

  it("rejects missing, short, and placeholder secrets", () => {
    expect(isWeakBetterAuthSecret("")).toBe(true);
    expect(isWeakBetterAuthSecret("short-secret")).toBe(true);
    expect(isWeakBetterAuthSecret(AUTH_SECRET_BUILD_PLACEHOLDER)).toBe(true);
    expect(isWeakBetterAuthSecret("a".repeat(AUTH_SECRET_MIN_LENGTH))).toBe(false);
  });

  it("allows next build to proceed without a live secret", () => {
    snapshotEnv();
    delete process.env.BETTER_AUTH_SECRET;
    process.env.NEXT_PHASE = "phase-production-build";
    expect(resolveBetterAuthSecret()).toBe(AUTH_SECRET_BUILD_PLACEHOLDER);
    expect(() => assertRuntimeAuthSecret()).not.toThrow();
  });

  it("refuses a weak secret at runtime", () => {
    snapshotEnv();
    delete process.env.NEXT_PHASE;
    process.env.BETTER_AUTH_SECRET = AUTH_SECRET_BUILD_PLACEHOLDER;
    expect(() => resolveBetterAuthSecret()).toThrow(/BETTER_AUTH_SECRET/);
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

describe("owner bootstrap", () => {
  it("is available only on an empty install with a configured setup secret", () => {
    expect(ownerSetupIsAvailable({ ownerCount: 0, setupSecretConfigured: true })).toBe(true);
    expect(ownerSetupIsAvailable({ ownerCount: 1, setupSecretConfigured: true })).toBe(false);
    expect(ownerSetupIsAvailable({ ownerCount: 0, setupSecretConfigured: false })).toBe(false);
  });

  it("rejects signup when an owner already exists even with a matching setup header", () => {
    const decision = allowOwnerBootstrapSignup({
      setupSecret: "bootstrap-secret-value",
      setupHeader: "bootstrap-secret-value",
      ownerCount: 1,
    });
    expect(decision).toEqual({
      ok: false,
      message: OWNER_BOOTSTRAP_ALREADY_PROVISIONED_MESSAGE,
    });
  });

  it("rejects signup without a matching one-time setup header", () => {
    const decision = allowOwnerBootstrapSignup({
      setupSecret: "bootstrap-secret-value",
      setupHeader: "wrong",
      ownerCount: 0,
    });
    expect(decision).toEqual({ ok: false, message: OWNER_BOOTSTRAP_DISABLED_MESSAGE });
  });

  it("allows first-owner signup only with the setup secret", () => {
    expect(
      allowOwnerBootstrapSignup({
        setupSecret: "bootstrap-secret-value",
        setupHeader: "bootstrap-secret-value",
        ownerCount: 0,
      }),
    ).toEqual({ ok: true });
  });
});

describe("removed privilege headers", () => {
  it("does not keep an x-staff-create signup bypass", () => {
    const authSource = readFileSync(resolve(process.cwd(), "lib/auth.ts"), "utf8");
    const setupSource = readFileSync(resolve(process.cwd(), "app/(auth)/setup/actions.ts"), "utf8");
    expect(authSource).not.toContain("x-staff-create");
    expect(authSource).not.toContain("staffHeader");
    expect(setupSource).not.toContain("owner.password.recovered");
  });
});

describe("secret comparison and MFA paths", () => {
  it("compares secrets in constant time and rejects empty values", () => {
    expect(secretsEqual("abc", "abc")).toBe(true);
    expect(secretsEqual("abc", "abd")).toBe(false);
    expect(secretsEqual("", "")).toBe(false);
  });

  it("treats security settings as the only MFA setup path", () => {
    expect(isTwoFactorSetupPath("/dashboard/security")).toBe(true);
    expect(isTwoFactorSetupPath("/dashboard/users")).toBe(false);
    expect(isPasswordChangePath("/set-password")).toBe(true);
  });
});
