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
  "employees.edit",
  "employees.sensitive.view",
  "customers.view",
  "customers.edit",
  "contracts.view",
  "contracts.edit",
  "contracts.delete",
  "compliance.view",
  "compliance.edit",
  "documents.view",
  "documents.upload",
  "documents.delete",
  "users.manage",
  "roles.manage",
  "audit.view",
  "settings.manage",
  "finance.view",
  "notifications.manage",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const ROLE_KEYS = [
  "OWNER",
  "HR_RECRUITER",
  "OPERATIONS_ADMIN",
  "DISPATCHER",
  "COMPLIANCE_ADMIN",
  "SALES_ACCOUNT_MANAGER",
  "EMPLOYEE",
  "CUSTOMER",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  OWNER: "Owner / Super Admin",
  HR_RECRUITER: "HR / Recruiter",
  OPERATIONS_ADMIN: "Operations Admin",
  DISPATCHER: "Dispatcher",
  COMPLIANCE_ADMIN: "Compliance Admin",
  SALES_ACCOUNT_MANAGER: "Sales / Account Manager",
  EMPLOYEE: "Employee",
  CUSTOMER: "Customer",
};

const ALL = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<RoleKey, readonly PermissionKey[]> = {
  OWNER: ALL,
  HR_RECRUITER: [
    "jobs.view",
    "jobs.create",
    "jobs.edit",
    "applicants.view",
    "applicants.edit",
    "applicants.notes.view",
    "employees.view",
    "documents.view",
    "documents.upload",
    "notifications.manage",
  ],
  OPERATIONS_ADMIN: [
    "employees.view",
    "customers.view",
    "contracts.view",
    "compliance.view",
    "documents.view",
    "documents.upload",
  ],
  DISPATCHER: [
    "employees.view",
    "customers.view",
    "compliance.view",
    "documents.view",
  ],
  COMPLIANCE_ADMIN: [
    "compliance.view",
    "compliance.edit",
    "employees.view",
    "documents.view",
    "documents.upload",
  ],
  SALES_ACCOUNT_MANAGER: [
    "customers.view",
    "customers.edit",
    "contracts.view",
    "contracts.edit",
    "documents.view",
    "documents.upload",
  ],
  EMPLOYEE: [],
  CUSTOMER: [],
};

export function roleHasPermission(role: RoleKey, permission: PermissionKey) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsForRoles(roles: RoleKey[]) {
  const set = new Set<PermissionKey>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role]) {
      set.add(permission);
    }
  }
  return set;
}

export function isOwnerRole(roles: RoleKey[]) {
  return roles.includes("OWNER");
}

export function canChangeOwnerAssignment(args: {
  actorRoles: RoleKey[];
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
