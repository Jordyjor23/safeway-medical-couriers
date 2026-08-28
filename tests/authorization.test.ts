import { describe, expect, it } from "vitest";
import { nextFailedLoginState } from "@/lib/account-status";
import { formatScopedId } from "@/lib/ids";
import { safeInternalPath } from "@/lib/paths";
import {
  canAccessCustomerTenant,
  canAccessOwnEmployeeRecord,
  canAccessPortal,
  canAssignRoleKey,
  canChangeOwnerAssignment,
  homePathForRoles,
  roleHasPermission,
} from "@/lib/permissions";

describe("authorization scenarios", () => {
  it("sends each role to its home dashboard", () => {
    expect(homePathForRoles(["OWNER"])).toBe("/dashboard");
    expect(homePathForRoles(["ADMIN"])).toBe("/admin/dashboard");
    expect(homePathForRoles(["OPERATIONS_MANAGER"])).toBe("/operations/dashboard");
    expect(homePathForRoles(["DISPATCHER"])).toBe("/dispatch/dashboard");
    expect(homePathForRoles(["DRIVER"])).toBe("/driver/dashboard");
    expect(homePathForRoles(["EMPLOYEE"])).toBe("/employee/dashboard");
    expect(homePathForRoles(["CUSTOMER"])).toBe("/customer/dashboard");
  });

  it("blocks drivers, employees, and customers from the staff/owner portal", () => {
    expect(canAccessPortal(["DRIVER"], "staff")).toBe(false);
    expect(canAccessPortal(["EMPLOYEE"], "staff")).toBe(false);
    expect(canAccessPortal(["EMPLOYEE"], "employee")).toBe(true);
    expect(canAccessPortal(["CUSTOMER"], "staff")).toBe(false);
    expect(canAccessPortal(["DISPATCHER"], "staff")).toBe(false);
    expect(canAccessPortal(["DRIVER"], "admin")).toBe(false);
    expect(canAccessPortal(["EMPLOYEE"], "owner" as never)).toBe(false);
  });

  it("blocks a driver from owner settings and other drivers' private HR data", () => {
    expect(roleHasPermission("DRIVER", "settings.manage")).toBe(false);
    expect(roleHasPermission("DRIVER", "system.manage")).toBe(false);
    expect(roleHasPermission("DRIVER", "employees.sensitive.view")).toBe(false);
    expect(canAccessOwnEmployeeRecord(["DRIVER"], "emp-1", "emp-2")).toBe(false);
    expect(canAccessOwnEmployeeRecord(["DRIVER"], "emp-1", "emp-1")).toBe(true);
  });

  it("blocks an employee from another employee's protected record", () => {
    expect(canAccessOwnEmployeeRecord(["EMPLOYEE"], "emp-a", "emp-b")).toBe(false);
    expect(canAccessOwnEmployeeRecord(["HR_RECRUITER"], "emp-a", "emp-b")).toBe(true);
  });

  it("isolates customer A from customer B records", () => {
    expect(canAccessCustomerTenant(["CUSTOMER"], "org-a", "org-b")).toBe(false);
    expect(canAccessCustomerTenant(["CUSTOMER"], "org-a", "org-a")).toBe(true);
    expect(canAccessCustomerTenant(["CUSTOMER"], null, "org-b")).toBe(false);
    expect(canAccessCustomerTenant(["DISPATCHER"], null, "org-b")).toBe(true);
  });

  it("keeps dispatchers off owner settings, payroll, and finance", () => {
    expect(canAccessPortal(["DISPATCHER"], "staff")).toBe(false);
    expect(roleHasPermission("DISPATCHER", "settings.manage")).toBe(false);
    expect(roleHasPermission("DISPATCHER", "finance.view")).toBe(false);
    expect(roleHasPermission("DISPATCHER", "employees.sensitive.view")).toBe(false);
    expect(roleHasPermission("DISPATCHER", "dispatch.assign")).toBe(true);
  });

  it("prevents an admin from assigning the Owner role to themselves", () => {
    expect(canAssignRoleKey(["ADMIN"], "OWNER")).toBe(false);
    expect(canAssignRoleKey(["OWNER"], "OWNER")).toBe(true);
    expect(
      canChangeOwnerAssignment({
        actorRoles: ["ADMIN"],
        targetIsOwner: false,
        ownerCount: 1,
        action: "grant",
      }),
    ).toBe(false);
  });

  it("locks accounts after repeated failed logins without unlocking terminated users", () => {
    expect(nextFailedLoginState(4, "ACTIVE")).toMatchObject({
      failedLoginCount: 5,
      accountStatus: "LOCKED",
    });
    const pendingLock = nextFailedLoginState(4, "PENDING_ACTIVATION");
    expect("accountStatus" in pendingLock).toBe(false);
    expect(pendingLock.failedLoginCount).toBe(5);
    expect(nextFailedLoginState(1, "ACTIVE")).toEqual({ failedLoginCount: 2 });
  });
});

describe("identifier and redirect helpers", () => {
  it("formats sequential employee, driver, and client IDs", () => {
    expect(formatScopedId("EMP", 1)).toBe("SC-EMP-0001");
    expect(formatScopedId("DRV", 12)).toBe("SC-DRV-0012");
    expect(formatScopedId("CLI", 1)).toBe("SC-CLI-0001");
  });

  it("rejects open redirects after login", () => {
    expect(safeInternalPath("//evil.example")).toBe("/portal");
    expect(safeInternalPath("https://evil.example")).toBe("/portal");
    expect(safeInternalPath("/driver/dashboard")).toBe("/driver/dashboard");
    expect(safeInternalPath("\\login")).toBe("/portal");
  });
});
