import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("owner-only permission hardening", () => {
  it("rejects owner-only permissions when saving non-owner roles", () => {
    const actions = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/roles/actions.ts"),
      "utf8",
    );
    expect(actions).toContain("OWNER_ONLY_PERMISSIONS");
    expect(actions).toContain("Owner-only permissions cannot be granted");
  });

  it("does not offer owner-only permissions in the non-owner role editor", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/roles/page.tsx"),
      "utf8",
    );
    expect(page).toContain("OWNER_ONLY_PERMISSIONS");
    expect(page).toContain("PERMISSIONS.filter");
  });

  it("fails closed if stale database links contain owner-only permissions", () => {
    const rbac = readFileSync(path.join(process.cwd(), "lib/rbac.ts"), "utf8");
    expect(rbac).toContain("OWNER_ONLY_PERMISSIONS");
    expect(rbac).toContain("includes(link.permission.key)");
    expect(rbac).toContain("continue;");
  });
});
