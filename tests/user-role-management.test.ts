import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("user role management wiring", () => {
  it("shows database-backed custom roles in user management", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/users/[userId]/page.tsx"),
      "utf8",
    );
    expect(page).toContain("prisma.role.findMany");
    expect(page).toContain("availableRoles.map");
    expect(page).not.toContain("SYSTEM_ROLE_KEYS.map");
  });

  it("keeps driver role assignment in sync with employee courier eligibility", () => {
    const actions = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/users/actions.ts"),
      "utf8",
    );
    expect(actions).toContain('if (roleKey === "DRIVER")');
    expect(actions).toContain('isDriver: action === "grant"');
  });

  it("does not grant employee or customer portal roles without linked records", () => {
    const actions = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/users/actions.ts"),
      "utf8",
    );
    expect(actions).toContain('roleKey === "EMPLOYEE" || roleKey === "DRIVER"');
    expect(actions).toContain('roleKey === "CUSTOMER"');
    expect(actions).toContain("prisma.customerUser.findUnique");
  });
});
