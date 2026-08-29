import { ROLE_PERMISSIONS, type RoleKey } from "@/lib/permissions";

export type RecipientUser = {
  id: string;
  email: string;
  roles: string[];
  employeeId?: string | null;
  customerId?: string | null;
  disabled?: boolean;
};

const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);
const REVIEWER_ROLES = new Set(["OWNER", "ADMIN", "COMPLIANCE_ADMIN"]);

export function roleCanReceiveDocumentNotification(role: string, type: string) {
  if (role === "CUSTOMER") {
    return type === "DOCUMENT_EXPIRING" || type === "DOCUMENT_EXPIRED" || type === "DOCUMENT_REJECTED";
  }
  if (role === "OPERATIONS_MANAGER") {
    return false;
  }
  if (role === "EMPLOYEE" || role === "DRIVER") {
    return (
      type === "DOCUMENT_EXPIRING" ||
      type === "DOCUMENT_EXPIRED" ||
      type === "REQUIRED_DOCUMENT_MISSING" ||
      type === "DOCUMENT_REJECTED" ||
      type === "COMPLIANCE_ACTION_REQUIRED"
    );
  }
  return true;
}

export function operationsManagerMayReviewExtraction() {
  return ROLE_PERMISSIONS.OPERATIONS_MANAGER.includes("documents.editMetadata" as never);
}

export function operationsManagerMayVerify() {
  return ROLE_PERMISSIONS.OPERATIONS_MANAGER.includes("documents.verify");
}

export function isAdminAudience(roles: string[]) {
  return roles.some((role) => ADMIN_ROLES.has(role));
}

export function isReviewerAudience(roles: string[]) {
  return roles.some((role) => REVIEWER_ROLES.has(role)) || roles.some((role) => hasVerifyPermission(role));
}

function hasVerifyPermission(role: string) {
  if (role === "OWNER") return true;
  if (!(role in ROLE_PERMISSIONS)) return false;
  return ROLE_PERMISSIONS[role as RoleKey].includes("documents.verify");
}

export function filterRecipientsForType(
  recipients: RecipientUser[],
  type: string,
  context: {
    associatedEmployeeIds: string[];
    associatedCustomerIds: string[];
    companyOrUnlinked: boolean;
  },
) {
  return recipients.filter((user) => {
    if (user.disabled) return false;
    if (!user.roles.some((role) => roleCanReceiveDocumentNotification(role, type))) return false;

    if (user.roles.includes("CUSTOMER")) {
      if (!user.customerId) return false;
      if (context.associatedEmployeeIds.length && !context.associatedCustomerIds.length) return false;
      return context.associatedCustomerIds.includes(user.customerId);
    }

    const employeeOnly = user.roles.some((role) => role === "EMPLOYEE" || role === "DRIVER") && !isAdminAudience(user.roles);
    if (employeeOnly) {
      return Boolean(user.employeeId && context.associatedEmployeeIds.includes(user.employeeId));
    }

    if (isAdminAudience(user.roles) || isReviewerAudience(user.roles)) {
      return true;
    }

    return context.companyOrUnlinked;
  });
}

export function uniqueRecipients(users: RecipientUser[]) {
  const seen = new Set<string>();
  const result: RecipientUser[] = [];
  for (const user of users) {
    if (!user.id || seen.has(user.id)) continue;
    seen.add(user.id);
    result.push(user);
  }
  return result;
}
