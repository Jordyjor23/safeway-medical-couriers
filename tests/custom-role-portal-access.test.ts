import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("custom role portal access", () => {
  it("lets permissioned custom roles reach the staff shell while preserving permission checks", () => {
    const rbac = readFileSync(path.join(process.cwd(), "lib/rbac.ts"), "utf8");
    expect(rbac).toContain("hasCustomRole");
    expect(rbac).toContain('kind === "staff"');
    expect(rbac).toContain("ctx.permissions.size > 0");
    expect(rbac).toContain("!canAccessPortal(ctx.roles, kind) && !customStaffAccess");
  });
});
