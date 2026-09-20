import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const proxySource = readFileSync(path.join(process.cwd(), "proxy.ts"), "utf8");

describe("portal login routing", () => {
  it("does not redirect /login solely because a session cookie exists", () => {
    expect(proxySource).not.toContain('pathname === "/login" && sessionCookie');
    expect(proxySource).toContain("Always allow the login page to render");
  });

  it("still protects authenticated portal routes when no session cookie exists", () => {
    expect(proxySource).toContain("isProtectedPortalPath(pathname) && !sessionCookie");
  });

  it("still redirects the portal root based on whether a cookie is present", () => {
    expect(proxySource).toContain('const destination = sessionCookie ? "/portal" : "/login"');
  });
});
