import { describe, expect, it } from "vitest";
import {
  ROLE_PERMISSIONS,
  canAccessPortal,
  canAssignRoleKey,
  canChangeOwnerAssignment,
  homePathForRoles,
  permissionsForRoles,
  roleHasPermission,
} from "@/lib/permissions";
import { accountAllowsLogin, accountAllowsPasswordReset } from "@/lib/account-status";
import { createTrackingNumber } from "@/lib/ids";

describe("RBAC matrix", () => {
  it("gives OWNER every permission", () => {
    expect(ROLE_PERMISSIONS.OWNER).toContain("users.manage");
    expect(ROLE_PERMISSIONS.OWNER).toContain("audit.view");
    expect(ROLE_PERMISSIONS.OWNER).toContain("applicants.screening.view");
    expect(ROLE_PERMISSIONS.OWNER).toContain("finance.view");
    expect(ROLE_PERMISSIONS.OWNER).toContain("permission.manage");
  });

  it("does not let HR change owner security or view finance settings", () => {
    expect(roleHasPermission("HR_RECRUITER", "roles.manage")).toBe(false);
    expect(roleHasPermission("HR_RECRUITER", "users.manage")).toBe(false);
    expect(roleHasPermission("HR_RECRUITER", "finance.view")).toBe(false);
    expect(roleHasPermission("HR_RECRUITER", "applicants.view")).toBe(true);
    expect(roleHasPermission("HR_RECRUITER", "applicants.screening.view")).toBe(false);
  });

  it("does not let dispatchers view applicant background reports or compensation finance", () => {
    expect(roleHasPermission("DISPATCHER", "applicants.view")).toBe(false);
    expect(roleHasPermission("DISPATCHER", "applicants.screening.view")).toBe(false);
    expect(roleHasPermission("DISPATCHER", "employees.sensitive.view")).toBe(false);
    expect(roleHasPermission("DISPATCHER", "finance.view")).toBe(false);
    expect(roleHasPermission("DISPATCHER", "dispatch.view")).toBe(true);
  });

  it("does not let sales view applicants or employee HR records", () => {
    expect(roleHasPermission("SALES_ACCOUNT_MANAGER", "applicants.view")).toBe(false);
    expect(roleHasPermission("SALES_ACCOUNT_MANAGER", "employees.view")).toBe(false);
    expect(roleHasPermission("SALES_ACCOUNT_MANAGER", "employees.sensitive.view")).toBe(false);
    expect(roleHasPermission("SALES_ACCOUNT_MANAGER", "customers.view")).toBe(true);
  });

  it("does not let compliance automatically access payroll/finance", () => {
    expect(roleHasPermission("COMPLIANCE_ADMIN", "finance.view")).toBe(false);
    expect(roleHasPermission("COMPLIANCE_ADMIN", "compliance.view")).toBe(true);
  });

  it("keeps Admin below Owner-only controls", () => {
    expect(roleHasPermission("ADMIN", "employees.view")).toBe(true);
    expect(roleHasPermission("ADMIN", "settings.manage")).toBe(false);
    expect(roleHasPermission("ADMIN", "roles.manage")).toBe(false);
    expect(roleHasPermission("ADMIN", "finance.view")).toBe(false);
    expect(canAssignRoleKey(["ADMIN"], "OWNER")).toBe(false);
  });

  it("keeps drivers off owner and finance surfaces", () => {
    expect(roleHasPermission("DRIVER", "settings.manage")).toBe(false);
    expect(roleHasPermission("DRIVER", "finance.view")).toBe(false);
    expect(roleHasPermission("DRIVER", "users.manage")).toBe(false);
    expect(roleHasPermission("DRIVER", "delivery.update")).toBe(true);
    expect(canAccessPortal(["DRIVER"], "staff")).toBe(false);
    expect(homePathForRoles(["DRIVER"])).toBe("/driver/dashboard");
  });

  it("routes employees and customers to isolated homes", () => {
    expect(homePathForRoles(["EMPLOYEE"])).toBe("/employee/dashboard");
    expect(homePathForRoles(["CUSTOMER"])).toBe("/customer/dashboard");
    expect(canAccessPortal(["CUSTOMER"], "staff")).toBe(false);
    expect(canAccessPortal(["EMPLOYEE"], "staff")).toBe(false);
  });

  it("prevents ordinary administrators from demoting the last owner", () => {
    expect(
      canChangeOwnerAssignment({
        actorRoles: ["HR_RECRUITER"],
        targetIsOwner: true,
        ownerCount: 1,
        action: "revoke",
      }),
    ).toBe(false);

    expect(
      canChangeOwnerAssignment({
        actorRoles: ["OWNER"],
        targetIsOwner: true,
        ownerCount: 1,
        action: "revoke",
      }),
    ).toBe(false);

    expect(
      canChangeOwnerAssignment({
        actorRoles: ["OWNER"],
        targetIsOwner: true,
        ownerCount: 2,
        action: "revoke",
      }),
    ).toBe(true);
  });

  it("unions permissions across multiple roles", () => {
    const permissions = permissionsForRoles(["DISPATCHER", "SALES_ACCOUNT_MANAGER"]);
    expect(permissions.has("customers.edit")).toBe(true);
    expect(permissions.has("applicants.view")).toBe(false);
  });
});

describe("account status", () => {
  it("blocks terminated, locked, and disabled accounts from login", () => {
    expect(accountAllowsLogin({ accountStatus: "ACTIVE" })).toBe(true);
    expect(accountAllowsLogin({ accountStatus: "PENDING_ACTIVATION" })).toBe(false);
    expect(accountAllowsLogin({ accountStatus: "TERMINATED" })).toBe(false);
    expect(accountAllowsLogin({ accountStatus: "SUSPENDED" })).toBe(false);
    expect(accountAllowsLogin({ accountStatus: "INACTIVE" })).toBe(false);
    expect(accountAllowsLogin({ accountStatus: "LOCKED", lockedUntil: new Date(Date.now() + 60_000) })).toBe(false);
    expect(accountAllowsLogin({ accountStatus: "LOCKED" })).toBe(false);
    expect(accountAllowsLogin({ accountStatus: "LOCKED", lockedUntil: new Date(Date.now() - 1000) })).toBe(true);
    expect(accountAllowsLogin({ disabled: true, accountStatus: "ACTIVE" })).toBe(false);
  });

  it("blocks password reset for terminated accounts", () => {
    expect(accountAllowsPasswordReset({ accountStatus: "ACTIVE" })).toBe(true);
    expect(accountAllowsPasswordReset({ accountStatus: "TERMINATED" })).toBe(false);
    expect(accountAllowsPasswordReset({ accountStatus: "SUSPENDED" })).toBe(false);
  });
});

describe("applicant tracking numbers", () => {
  it("creates a non-sequential public tracking number", () => {
    const value = createTrackingNumber(new Date("2026-08-27T00:00:00Z"));
    expect(value).toMatch(/^SWC-2026-[A-Z0-9]{6}$/);
    expect(value).not.toMatch(/uuid/i);
  });
});
