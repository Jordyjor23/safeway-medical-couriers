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
  it("prevents terminated accounts from being reactivated through generic status actions", () => {
    const actions = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/users/actions.ts"),
      "utf8",
    );
    const accountActions = readFileSync(
      path.join(process.cwd(), "components/portal/UserAccountActions.tsx"),
      "utf8",
    );
    expect(actions).toContain('target.accountStatus === "TERMINATED"');
    expect(actions).toContain("Terminated accounts cannot be reactivated");
    expect(accountActions).toContain('status === "TERMINATED"');
    expect(accountActions).toContain("Terminated access cannot be reactivated");
  });

  it("returns explicit protection messages for self-service and final-owner account changes", () => {
    const actions = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/users/actions.ts"),
      "utf8",
    );
    expect(actions).toContain("You cannot change your own account status here.");
    expect(actions).toContain("The final Owner account cannot be locked or disabled.");
    expect(actions).toContain("The final Owner account cannot be terminated.");
  });
});
