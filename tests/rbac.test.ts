import { describe, expect, it } from "vitest";
import {
  ROLE_PERMISSIONS,
  canChangeOwnerAssignment,
  permissionsForRoles,
  roleHasPermission,
} from "@/lib/permissions";
import { createTrackingNumber } from "@/lib/ids";

describe("RBAC matrix", () => {
  it("gives OWNER every permission", () => {
    expect(ROLE_PERMISSIONS.OWNER).toContain("users.manage");
    expect(ROLE_PERMISSIONS.OWNER).toContain("audit.view");
    expect(ROLE_PERMISSIONS.OWNER).toContain("applicants.screening.view");
    expect(ROLE_PERMISSIONS.OWNER).toContain("finance.view");
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
    expect(roleHasPermission("DISPATCHER", "employees.view")).toBe(true);
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

  it("keeps employee and customer portal roles empty of staff permissions", () => {
    expect(ROLE_PERMISSIONS.EMPLOYEE).toHaveLength(0);
    expect(ROLE_PERMISSIONS.CUSTOMER).toHaveLength(0);
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

describe("applicant tracking numbers", () => {
  it("creates a non-sequential public tracking number", () => {
    const value = createTrackingNumber(new Date("2026-08-27T00:00:00Z"));
    expect(value).toMatch(/^SWC-2026-[A-Z0-9]{6}$/);
    expect(value).not.toMatch(/uuid/i);
  });
});
