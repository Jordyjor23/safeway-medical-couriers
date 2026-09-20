import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("full debug sweep regression guards", () => {
  it("keeps the legacy driver recruiting image URL valid without embedded base64", () => {
    const route = readFileSync(
      path.join(process.cwd(), "app/driver-recruiting-share-v2.png/route.tsx"),
      "utf8",
    );
    expect(route).toContain('"/driver-recruiting-share-v3.png"');
    expect(route).toContain("Response.redirect");
    expect(route).not.toContain("PNG_BASE64");
    expect(route).not.toContain("atob(");
  });

  it("smoke-checks core public and protected routes", () => {
    const smoke = readFileSync(path.join(process.cwd(), "scripts/smoke-readonly.mjs"), "utf8");
    for (const route of [
      "/drivers",
      "/careers/status",
      "/dashboard/roles",
      "/dashboard/users",
      "/dashboard/applicants",
      "/dashboard/interviews",
      "/dashboard/workforce",
      "/dashboard/payroll",
      "/dashboard/documents",
      "/dashboard/compliance",
      "/dashboard/contracts",
    ]) {
      expect(smoke).toContain(route);
    }
  });
});
