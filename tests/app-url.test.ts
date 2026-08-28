import { afterEach, describe, expect, it } from "vitest";
import {
  appOrigin,
  isAllowedOrigin,
  isLocalHostname,
  isMarketingHostname,
  isPortalPath,
  isProtectedPortalPath,
  PRODUCTION_PORTAL_ORIGIN,
} from "@/lib/app-url";

const KEYS = [
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_URL",
  "VERCEL",
  "VERCEL_ENV",
] as const;

describe("app origin helpers", () => {
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

  it("uses BETTER_AUTH_URL when set", () => {
    snapshotEnv();
    process.env.BETTER_AUTH_URL = "https://portal.safewaycouriers.com/";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(appOrigin()).toBe("https://portal.safewaycouriers.com");
  });

  it("falls back to VERCEL_URL", () => {
    snapshotEnv();
    delete process.env.BETTER_AUTH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_ENV;
    process.env.VERCEL_URL = "safeway-couriers-git-main.vercel.app";
    expect(appOrigin()).toBe("https://safeway-couriers-git-main.vercel.app");
  });

  it("keeps Vercel production on the portal even if localhost is configured", () => {
    snapshotEnv();
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL = "1";
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    expect(appOrigin()).toBe(PRODUCTION_PORTAL_ORIGIN);
  });

  it("classifies portal and marketing hosts", () => {
    expect(isLocalHostname("localhost")).toBe(true);
    expect(isMarketingHostname("www.safewaycouriers.com")).toBe(true);
    expect(isMarketingHostname("portal.safewaycouriers.com")).toBe(false);
    expect(isPortalPath("/login")).toBe(true);
    expect(isPortalPath("/activate-account")).toBe(true);
    expect(isPortalPath("/reset-password/reset-token")).toBe(true);
    expect(isPortalPath("/dashboard/users")).toBe(true);
    expect(isPortalPath("/about")).toBe(false);
    expect(isProtectedPortalPath("/login")).toBe(false);
    expect(isProtectedPortalPath("/driver/dashboard")).toBe(true);
    expect(PRODUCTION_PORTAL_ORIGIN).toBe("https://portal.safewaycouriers.com");
  });

  it("allows only configured CORS origins", () => {
    snapshotEnv();
    process.env.BETTER_AUTH_URL = "https://portal.safewaycouriers.com";
    expect(isAllowedOrigin("https://portal.safewaycouriers.com")).toBe(true);
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });
});
