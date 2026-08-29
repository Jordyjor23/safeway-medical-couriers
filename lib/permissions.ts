export const PERMISSIONS = [
  "jobs.view",
  "jobs.create",
  "jobs.edit",
  "jobs.publish",
  "applicants.view",
  "applicants.edit",
  "applicants.screening.view",
  "applicants.notes.view",
  "employees.view",
  "employees.create",
  "employees.edit",
  "employees.disable",
  "employees.sensitive.view",
  "driver.view",
  "driver.assign",
  "driver.manage",
  "customers.view",
  "customers.create",
  "customers.edit",
  "contracts.view",
  "contracts.create",
  "contracts.edit",
  "contracts.delete",
  "dispatch.view",
  "dispatch.create",
  "dispatch.assign",
  "delivery.view",
  "delivery.create",
  "delivery.update",
  "compliance.view",
  "compliance.edit",
  "compliance.manage",
  "training.view",
  "training.manage",
  "incident.view",
  "incident.manage",
  "documents.view",
  "documents.upload",
  "documents.editMetadata",
  "documents.verify",
  "documents.archive",
  "documents.delete",
  "documents.download",
  "documents.viewSensitive",
  "billing.view",
  "billing.manage",
  "users.manage",
  "user.create",
  "user.edit",
  "user.disable",
  "roles.manage",
  "permission.manage",
  "audit.view",
  "settings.manage",
  "system.manage",
  "finance.view",
  "notifications.manage",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const SYSTEM_ROLE_KEYS = [
  "OWNER",
  "ADMIN",
  "OPERATIONS_MANAGER",
  "HR_RECRUITER",
  "OPERATIONS_ADMIN",
  "DISPATCHER",
  "DRIVER",
  "COMPLIANCE_ADMIN",
  "SALES_ACCOUNT_MANAGER",
  "EMPLOYEE",
  "CUSTOMER",
] as const;

/** @deprecated Use SYSTEM_ROLE_KEYS. Kept so existing imports continue to work. */
export const ROLE_KEYS = SYSTEM_ROLE_KEYS;

export type RoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  OWNER: "Owner / Super Admin",
  ADMIN: "Admin",
  OPERATIONS_MANAGER: "Operations Manager",
  HR_RECRUITER: "HR / Recruiter",
  OPERATIONS_ADMIN: "Operations Admin",
  DISPATCHER: "Dispatcher",
  DRIVER: "Driver / Courier",
  COMPLIANCE_ADMIN: "Compliance Admin",
  SALES_ACCOUNT_MANAGER: "Sales / Account Manager",
  EMPLOYEE: "Employee",
  CUSTOMER: "Customer / Client",
};

const ALL = [...PERMISSIONS];

const DAILY_ADMIN: PermissionKey[] = [
  "jobs.view",
  "jobs.create",
  "jobs.edit",
  "applicants.view",
  "applicants.edit",
  "applicants.notes.view",
  "employees.view",
  "employees.create",
  "employees.edit",
  "driver.view",
  "driver.assign",
  "customers.view",
  "customers.create",
  "customers.edit",
  "contracts.view",
  "contracts.create",
  "contracts.edit",
  "dispatch.view",
  "delivery.view",
  "delivery.create",
  "delivery.update",
  "compliance.view",
  "training.view",
  "incident.view",
  "documents.view",
  "documents.upload",
  "documents.download",
  "documents.editMetadata",
  "documents.archive",
  "documents.verify",
  "documents.viewSensitive",
  "notifications.manage",
];

export const ROLE_PERMISSIONS: Record<RoleKey, readonly PermissionKey[]> = {
  OWNER: ALL,
  ADMIN: DAILY_ADMIN,
  OPERATIONS_MANAGER: [
    "employees.view",
    "driver.view",
    "driver.assign",
    "driver.manage",
    "customers.view",
    "dispatch.view",
    "dispatch.create",
    "dispatch.assign",
    "delivery.view",
    "delivery.create",
    "delivery.update",
    "incident.view",
    "incident.manage",
    "compliance.view",
    "documents.view",
    "documents.upload",
    "documents.download",
    "documents.archive",
  ],
  HR_RECRUITER: [
    "jobs.view",
    "jobs.create",
    "jobs.edit",
    "applicants.view",
    "applicants.edit",
    "applicants.notes.view",
    "employees.view",
    "employees.create",
    "employees.edit",
    "training.view",
    "documents.view",
    "documents.upload",
    "documents.download",
    "documents.editMetadata",
    "documents.viewSensitive",
    "notifications.manage",
  ],
  OPERATIONS_ADMIN: [
    "employees.view",
    "driver.view",
    "customers.view",
    "contracts.view",
    "dispatch.view",
    "delivery.view",
    "compliance.view",
    "documents.view",
    "documents.upload",
    "documents.download",
    "documents.archive",
  ],
  DISPATCHER: [
    "driver.view",
    "driver.assign",
    "customers.view",
    "dispatch.view",
    "dispatch.create",
    "dispatch.assign",
    "delivery.view",
    "delivery.create",
    "delivery.update",
    "incident.view",
    "documents.view",
    "documents.download",
  ],
  DRIVER: ["delivery.view", "delivery.update", "incident.view", "training.view", "documents.view", "documents.download"],
  COMPLIANCE_ADMIN: [
    "compliance.view",
    "compliance.edit",
    "compliance.manage",
    "training.view",
    "training.manage",
    "employees.view",
    "incident.view",
    "incident.manage",
    "documents.view",
    "documents.upload",
    "documents.download",
    "documents.editMetadata",
    "documents.verify",
    "documents.archive",
    "documents.viewSensitive",
  ],
  SALES_ACCOUNT_MANAGER: [
    "customers.view",
    "customers.create",
    "customers.edit",
    "contracts.view",
    "contracts.create",
    "contracts.edit",
    "delivery.view",
    "documents.view",
    "documents.upload",
    "documents.download",
    "documents.editMetadata",
  ],
  EMPLOYEE: ["training.view", "documents.view", "documents.download", "incident.view"],
  CUSTOMER: ["delivery.view", "contracts.view", "documents.view", "documents.download"],
};

export const OWNER_ONLY_PERMISSIONS: readonly PermissionKey[] = [
  "settings.manage",
  "system.manage",
  "permission.manage",
  "roles.manage",
  "finance.view",
  "billing.manage",
  "applicants.screening.view",
  "employees.sensitive.view",
];

export function roleHasPermission(role: string, permission: PermissionKey) {
  if (role === "OWNER") return true;
  if (!(role in ROLE_PERMISSIONS)) return false;
  return ROLE_PERMISSIONS[role as RoleKey].includes(permission);
}

export function permissionsForRoles(roles: string[]) {
  const set = new Set<PermissionKey>();
  for (const role of roles) {
    if (role === "OWNER") {
      for (const permission of ALL) set.add(permission);
      continue;
    }
    const list = ROLE_PERMISSIONS[role as RoleKey];
    if (!list) continue;
    for (const permission of list) set.add(permission);
  }
  return set;
}

export function isOwnerRole(roles: string[]) {
  return roles.includes("OWNER");
}

export function isSystemRole(key: string): key is RoleKey {
  return (SYSTEM_ROLE_KEYS as readonly string[]).includes(key);
}

export function roleLabel(key: string) {
  return isSystemRole(key) ? ROLE_LABELS[key] : key.replaceAll("_", " ");
}

export function canChangeOwnerAssignment(args: {
  actorRoles: string[];
  targetIsOwner: boolean;
  ownerCount: number;
  action: "grant" | "revoke" | "delete-user";
}) {
  if (!args.actorRoles.includes("OWNER")) return false;
  if (!args.targetIsOwner) return true;
  if (args.action === "grant") return true;
  if (args.ownerCount <= 1) return false;
  return true;
}

export function canAssignRoleKey(actorRoles: string[], roleKey: string) {
  if (roleKey === "OWNER") return actorRoles.includes("OWNER");
  return actorRoles.includes("OWNER") || actorRoles.includes("ADMIN");
}

export type PortalKind = "staff" | "admin" | "operations" | "dispatch" | "driver" | "employee" | "customer";

export function homePathForRoles(roles: string[]) {
  if (roles.includes("OWNER")) return "/dashboard";
  if (roles.includes("ADMIN")) return "/admin/dashboard";
  if (roles.includes("OPERATIONS_MANAGER")) return "/operations/dashboard";
  if (roles.includes("DISPATCHER")) return "/dispatch/dashboard";
  if (roles.includes("DRIVER")) return "/driver/dashboard";
  if (
    roles.includes("HR_RECRUITER") ||
    roles.includes("OPERATIONS_ADMIN") ||
    roles.includes("COMPLIANCE_ADMIN") ||
    roles.includes("SALES_ACCOUNT_MANAGER")
  ) {
    return "/dashboard";
  }
  if (roles.includes("EMPLOYEE")) return "/employee/dashboard";
  if (roles.includes("CUSTOMER")) return "/customer/dashboard";
  return "/dashboard";
}

export function portalKindForRoles(roles: string[]): PortalKind {
  if (roles.includes("OWNER") || roles.includes("HR_RECRUITER") || roles.includes("OPERATIONS_ADMIN") || roles.includes("COMPLIANCE_ADMIN") || roles.includes("SALES_ACCOUNT_MANAGER")) {
    return "staff";
  }
  if (roles.includes("ADMIN")) return "admin";
  if (roles.includes("OPERATIONS_MANAGER")) return "operations";
  if (roles.includes("DISPATCHER")) return "dispatch";
  if (roles.includes("DRIVER")) return "driver";
  if (roles.includes("EMPLOYEE")) return "employee";
  if (roles.includes("CUSTOMER")) return "customer";
  return "staff";
}

export function canAccessCustomerTenant(
  roles: string[],
  userCustomerId: string | null | undefined,
  requestedCustomerId: string,
) {
  if (isOwnerRole(roles)) return true;
  if (roles.includes("CUSTOMER")) {
    return Boolean(userCustomerId) && userCustomerId === requestedCustomerId;
  }
  return true;
}

export function canAccessOwnEmployeeRecord(
  roles: string[],
  userEmployeeId: string | null | undefined,
  requestedEmployeeId: string,
) {
  const privileged =
    isOwnerRole(roles) ||
    roles.includes("ADMIN") ||
    roles.includes("HR_RECRUITER") ||
    roles.includes("OPERATIONS_MANAGER") ||
    roles.includes("OPERATIONS_ADMIN") ||
    roles.includes("COMPLIANCE_ADMIN");
  if (privileged) return true;
  if (roles.includes("DRIVER") || roles.includes("EMPLOYEE")) {
    return Boolean(userEmployeeId) && userEmployeeId === requestedEmployeeId;
  }
  return true;
}

export function canAccessPortal(roles: string[], kind: PortalKind) {
  if (roles.includes("OWNER")) return true;
  switch (kind) {
    case "staff":
      return (
        roles.includes("ADMIN") ||
        roles.includes("HR_RECRUITER") ||
        roles.includes("OPERATIONS_ADMIN") ||
        roles.includes("COMPLIANCE_ADMIN") ||
        roles.includes("SALES_ACCOUNT_MANAGER")
      );
    case "admin":
      return roles.includes("ADMIN");
    case "operations":
      return roles.includes("OPERATIONS_MANAGER") || roles.includes("ADMIN");
    case "dispatch":
      return roles.includes("DISPATCHER") || roles.includes("OPERATIONS_MANAGER") || roles.includes("ADMIN");
    case "driver":
      return roles.includes("DRIVER");
    case "employee":
      return roles.includes("EMPLOYEE") || roles.includes("DRIVER") || roles.includes("DISPATCHER");
    case "customer":
      return roles.includes("CUSTOMER");
    default:
      return false;
  }
}
