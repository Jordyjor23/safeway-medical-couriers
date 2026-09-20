import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("compliance center", () => {
  it("keeps the compliance library and matrix routes present", () => {
    expect(existsSync(path.join(process.cwd(), "app/(portal)/dashboard/compliance/library/page.tsx"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "app/(portal)/dashboard/compliance/matrix/page.tsx"))).toBe(true);
  });

  it("reuses the existing secured document ACL instead of creating a parallel file store", () => {
    const library = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/compliance/library/page.tsx"),
      "utf8",
    );
    expect(library).toContain("documentsListWhere(ctx)");
    expect(library).toContain("managedDocument");
    expect(library).not.toContain("CompanyDocument");
  });

  it("makes the new views discoverable from compliance tracking", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/compliance/page.tsx"),
      "utf8",
    );
    expect(page).toContain("/dashboard/compliance/library");
    expect(page).toContain("/dashboard/compliance/matrix");
    expect(page).toContain("/dashboard/documents/alerts");
  });
});
