import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const criticalRoutes = [
  "app/(auth)/login/page.tsx",
  "app/(auth)/forgot-password/page.tsx",
  "app/(portal)/dashboard/page.tsx",
  "app/(portal)/dashboard/roles/page.tsx",
  "app/(portal)/dashboard/users/page.tsx",
  "app/(portal)/dashboard/users/[userId]/page.tsx",
  "app/(portal)/dashboard/applicants/page.tsx",
  "app/(portal)/dashboard/interviews/page.tsx",
  "app/(portal)/dashboard/employees/page.tsx",
  "app/(portal)/dashboard/workforce/page.tsx",
  "app/(portal)/dashboard/payroll/page.tsx",
  "app/(portal)/dashboard/documents/page.tsx",
  "app/(portal)/dashboard/compliance/page.tsx",
  "app/(portal)/dashboard/contracts/page.tsx",
  "app/(portal)/dashboard/contracts/operating-model/page.tsx",
  "app/(marketing)/page.tsx",
  "app/(marketing)/careers/page.tsx",
  "app/(marketing)/careers/accessibility/page.tsx",
  "app/(marketing)/careers/privacy/page.tsx",
  "app/(marketing)/privacy/page.tsx",
  "app/(marketing)/terms/page.tsx",
  "app/(marketing)/contact/page.tsx",
];

describe("critical route inventory", () => {
  for (const route of criticalRoutes) {
    it(`keeps ${route} in the Safeway repository`, () => {
      expect(existsSync(path.join(root, route))).toBe(true);
    });
  }

  it("keeps role and user management wired to their actions", () => {
    const roles = readFileSync(path.join(root, "app/(portal)/dashboard/roles/page.tsx"), "utf8");
    const users = readFileSync(path.join(root, "app/(portal)/dashboard/users/page.tsx"), "utf8");
    expect(roles).toContain("RolePermissionsForm");
    expect(users).toContain("/dashboard/users/");
    expect(users).toContain("Manage");
  });

  it("keeps the interview workflow linked from the portal", () => {
    const sidebar = readFileSync(path.join(root, "components/portal/PortalSidebar.tsx"), "utf8");
    expect(sidebar).toContain("/dashboard/interviews");
  });
});
