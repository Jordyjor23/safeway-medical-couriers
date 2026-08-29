import type { Prisma } from "@prisma/client";
import { isOwnerRole } from "@/lib/permissions";

export type DocumentActor = {
  user: { id: string; employeeId?: string | null; customerId?: string | null };
  roles: string[];
  permissions: Set<string>;
};

export const DOCUMENT_ACCESS_INCLUDE = {
  employeeLinks: { select: { employeeId: true } },
  customerLinks: { select: { customerId: true } },
  contractLinks: { select: { contract: { select: { customerId: true } } } },
  deliveryLinks: {
    select: { delivery: { select: { customerId: true, driverEmployeeId: true } } },
  },
} satisfies Prisma.ManagedDocumentInclude;

export type DocumentAccessRecord = {
  id: string;
  isSensitive: boolean;
  employeeLinks: { employeeId: string }[];
  customerLinks: { customerId: string }[];
  contractLinks: { contract: { customerId: string } }[];
  deliveryLinks: { delivery: { customerId: string; driverEmployeeId: string | null } }[];
};

export type DocumentAccessAction = "view" | "download" | "edit" | "verify" | "archive";

const EMPLOYEE_DOC_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "HR_RECRUITER",
  "OPERATIONS_MANAGER",
  "OPERATIONS_ADMIN",
  "COMPLIANCE_ADMIN",
]);

const CUSTOMER_DOC_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "OPERATIONS_MANAGER",
  "OPERATIONS_ADMIN",
  "SALES_ACCOUNT_MANAGER",
  "COMPLIANCE_ADMIN",
]);

const UNLINKED_DOC_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "HR_RECRUITER",
  "OPERATIONS_MANAGER",
  "OPERATIONS_ADMIN",
  "COMPLIANCE_ADMIN",
]);

const DELIVERY_DOC_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "OPERATIONS_MANAGER",
  "OPERATIONS_ADMIN",
  "DISPATCHER",
  "SALES_ACCOUNT_MANAGER",
  "COMPLIANCE_ADMIN",
]);

function hasPermission(ctx: DocumentActor, permission: string) {
  return isOwnerRole(ctx.roles) || ctx.permissions.has(permission);
}

function hasRole(ctx: DocumentActor, roles: Set<string>) {
  return ctx.roles.some((role) => roles.has(role));
}

function associatedEmployeeIds(document: DocumentAccessRecord) {
  return document.employeeLinks.map((link) => link.employeeId);
}

function associatedCustomerIds(document: DocumentAccessRecord) {
  return [
    ...document.customerLinks.map((link) => link.customerId),
    ...document.contractLinks.map((link) => link.contract.customerId),
    ...document.deliveryLinks.map((link) => link.delivery.customerId),
  ];
}

function isUnlinked(document: DocumentAccessRecord) {
  return (
    document.employeeLinks.length === 0 &&
    document.customerLinks.length === 0 &&
    document.contractLinks.length === 0 &&
    document.deliveryLinks.length === 0
  );
}

function linkedToOwnEmployee(ctx: DocumentActor, document: DocumentAccessRecord) {
  return Boolean(ctx.user.employeeId && associatedEmployeeIds(document).includes(ctx.user.employeeId));
}

function linkedToOwnCustomer(ctx: DocumentActor, document: DocumentAccessRecord) {
  return Boolean(ctx.user.customerId && associatedCustomerIds(document).includes(ctx.user.customerId));
}

function linkedToAssignedDelivery(ctx: DocumentActor, document: DocumentAccessRecord) {
  return Boolean(
    ctx.user.employeeId &&
      document.deliveryLinks.some((link) => link.delivery.driverEmployeeId === ctx.user.employeeId),
  );
}

function permissionForAction(action: DocumentAccessAction) {
  switch (action) {
    case "download":
      return "documents.download";
    case "edit":
      return "documents.editMetadata";
    case "verify":
      return "documents.verify";
    case "archive":
      return "documents.archive";
    default:
      return "documents.view";
  }
}

function canSeeSensitive(ctx: DocumentActor, document: DocumentAccessRecord) {
  if (!document.isSensitive) return true;
  if (isOwnerRole(ctx.roles)) return true;
  if (linkedToOwnEmployee(ctx, document)) return true;
  return hasPermission(ctx, "documents.viewSensitive");
}

export function canAccessManagedDocument(
  ctx: DocumentActor,
  document: DocumentAccessRecord,
  action: DocumentAccessAction = "view",
) {
  if (!hasPermission(ctx, "documents.view")) return false;
  if (!hasActionPermission(ctx, action)) return false;
  if (!canSeeSensitive(ctx, document)) return false;
  if (isOwnerRole(ctx.roles)) return true;

  const restricted = ctx.roles.includes("DRIVER") || ctx.roles.includes("EMPLOYEE") || ctx.roles.includes("CUSTOMER");
  if (restricted) {
    if (ctx.roles.includes("CUSTOMER")) return linkedToOwnCustomer(ctx, document);
    return linkedToOwnEmployee(ctx, document) || linkedToAssignedDelivery(ctx, document);
  }

  if (isUnlinked(document)) {
    return hasRole(ctx, UNLINKED_DOC_ROLES);
  }

  if (document.employeeLinks.length && hasRole(ctx, EMPLOYEE_DOC_ROLES) && hasPermission(ctx, "employees.view")) {
    return true;
  }
  if (
    (document.customerLinks.length || document.contractLinks.length) &&
    hasRole(ctx, CUSTOMER_DOC_ROLES) &&
    (hasPermission(ctx, "customers.view") || hasPermission(ctx, "contracts.view"))
  ) {
    return true;
  }
  if (document.deliveryLinks.length && hasRole(ctx, DELIVERY_DOC_ROLES) && hasPermission(ctx, "delivery.view")) {
    return true;
  }
  return false;
}

function hasActionPermission(ctx: DocumentActor, action: DocumentAccessAction) {
  if (action === "view") return true;
  if (action === "archive") {
    return hasPermission(ctx, "documents.archive") || hasPermission(ctx, "documents.delete");
  }
  return hasPermission(ctx, permissionForAction(action));
}

export function documentsListWhere(ctx: DocumentActor): Prisma.ManagedDocumentWhereInput {
  if (!hasPermission(ctx, "documents.view")) {
    return { id: { in: [] } };
  }

  const sensitive: Prisma.ManagedDocumentWhereInput = canSeeAllSensitive(ctx)
    ? {}
    : {
        OR: [
          { isSensitive: false },
          ctx.user.employeeId ? { employeeLinks: { some: { employeeId: ctx.user.employeeId } } } : { id: { in: [] } },
        ],
      };

  if (isOwnerRole(ctx.roles)) {
    return sensitive;
  }

  const clauses: Prisma.ManagedDocumentWhereInput[] = [];
  const restricted = ctx.roles.includes("DRIVER") || ctx.roles.includes("EMPLOYEE") || ctx.roles.includes("CUSTOMER");

  if (ctx.roles.includes("CUSTOMER")) {
    if (ctx.user.customerId) {
      clauses.push(
        { customerLinks: { some: { customerId: ctx.user.customerId } } },
        { contractLinks: { some: { contract: { customerId: ctx.user.customerId } } } },
        { deliveryLinks: { some: { delivery: { customerId: ctx.user.customerId } } } },
      );
    }
  }

  if (ctx.roles.includes("DRIVER") || ctx.roles.includes("EMPLOYEE")) {
    if (ctx.user.employeeId) {
      clauses.push({ employeeLinks: { some: { employeeId: ctx.user.employeeId } } });
      clauses.push({ deliveryLinks: { some: { delivery: { driverEmployeeId: ctx.user.employeeId } } } });
    }
  }

  if (!restricted) {
    if (hasRole(ctx, UNLINKED_DOC_ROLES)) {
      clauses.push({
        AND: [
          { employeeLinks: { none: {} } },
          { customerLinks: { none: {} } },
          { contractLinks: { none: {} } },
          { deliveryLinks: { none: {} } },
        ],
      });
    }
    if (hasRole(ctx, EMPLOYEE_DOC_ROLES) && hasPermission(ctx, "employees.view")) {
      clauses.push({ employeeLinks: { some: {} } });
    }
    if (hasRole(ctx, CUSTOMER_DOC_ROLES) && (hasPermission(ctx, "customers.view") || hasPermission(ctx, "contracts.view"))) {
      clauses.push({ customerLinks: { some: {} } }, { contractLinks: { some: {} } });
    }
    if (hasRole(ctx, DELIVERY_DOC_ROLES) && hasPermission(ctx, "delivery.view")) {
      clauses.push({ deliveryLinks: { some: {} } });
    }
  }

  if (!clauses.length) {
    return { id: { in: [] } };
  }

  return { AND: [{ OR: clauses }, sensitive] };
}

function canSeeAllSensitive(ctx: DocumentActor) {
  return isOwnerRole(ctx.roles) || hasPermission(ctx, "documents.viewSensitive");
}

export function canAssociateEmployee(ctx: DocumentActor, employeeId: string) {
  if (!hasPermission(ctx, "documents.upload") && !hasPermission(ctx, "documents.editMetadata")) return false;
  if (isOwnerRole(ctx.roles)) return true;
  if (ctx.roles.includes("CUSTOMER")) return false;
  if (ctx.roles.includes("DRIVER") || ctx.roles.includes("EMPLOYEE")) {
    return Boolean(ctx.user.employeeId && ctx.user.employeeId === employeeId);
  }
  return hasRole(ctx, EMPLOYEE_DOC_ROLES) && hasPermission(ctx, "employees.view");
}

export function canAssociateCustomer(ctx: DocumentActor, customerId: string) {
  if (!hasPermission(ctx, "documents.upload") && !hasPermission(ctx, "documents.editMetadata")) return false;
  if (isOwnerRole(ctx.roles)) return true;
  if (ctx.roles.includes("CUSTOMER")) {
    return Boolean(ctx.user.customerId && ctx.user.customerId === customerId) && hasPermission(ctx, "documents.upload");
  }
  return hasRole(ctx, CUSTOMER_DOC_ROLES) && hasPermission(ctx, "customers.view");
}

export function canAssociateContract(ctx: DocumentActor, customerId: string) {
  if (!hasPermission(ctx, "documents.upload") && !hasPermission(ctx, "documents.editMetadata")) return false;
  if (isOwnerRole(ctx.roles)) return true;
  if (ctx.roles.includes("CUSTOMER")) {
    return Boolean(ctx.user.customerId && ctx.user.customerId === customerId) && hasPermission(ctx, "documents.upload");
  }
  return hasRole(ctx, CUSTOMER_DOC_ROLES) && hasPermission(ctx, "contracts.view");
}

export function canAssociateDelivery(
  ctx: DocumentActor,
  delivery: { customerId: string; driverEmployeeId: string | null },
) {
  if (!hasPermission(ctx, "documents.upload") && !hasPermission(ctx, "documents.editMetadata")) return false;
  if (isOwnerRole(ctx.roles)) return true;
  if (ctx.roles.includes("CUSTOMER")) {
    return Boolean(ctx.user.customerId && ctx.user.customerId === delivery.customerId) && hasPermission(ctx, "documents.upload");
  }
  if (ctx.roles.includes("DRIVER") || ctx.roles.includes("EMPLOYEE")) {
    return Boolean(ctx.user.employeeId && delivery.driverEmployeeId === ctx.user.employeeId);
  }
  return hasRole(ctx, DELIVERY_DOC_ROLES) && hasPermission(ctx, "delivery.view");
}

export function associationPickerKinds(ctx: DocumentActor) {
  const canWrite = hasPermission(ctx, "documents.upload") || hasPermission(ctx, "documents.editMetadata");
  if (!canWrite) {
    return { employee: false, customer: false, contract: false, delivery: false };
  }
  const owner = isOwnerRole(ctx.roles);
  return {
    employee:
      owner ||
      (hasRole(ctx, EMPLOYEE_DOC_ROLES) && hasPermission(ctx, "employees.view")) ||
      ((ctx.roles.includes("DRIVER") || ctx.roles.includes("EMPLOYEE")) && Boolean(ctx.user.employeeId)),
    customer:
      owner ||
      (hasRole(ctx, CUSTOMER_DOC_ROLES) && hasPermission(ctx, "customers.view")) ||
      (ctx.roles.includes("CUSTOMER") && Boolean(ctx.user.customerId) && hasPermission(ctx, "documents.upload")),
    contract:
      owner ||
      (hasRole(ctx, CUSTOMER_DOC_ROLES) && hasPermission(ctx, "contracts.view")) ||
      (ctx.roles.includes("CUSTOMER") && Boolean(ctx.user.customerId) && hasPermission(ctx, "documents.upload")),
    delivery:
      owner ||
      (hasRole(ctx, DELIVERY_DOC_ROLES) && hasPermission(ctx, "delivery.view")) ||
      ((ctx.roles.includes("DRIVER") || ctx.roles.includes("EMPLOYEE")) && Boolean(ctx.user.employeeId)),
  };
}
