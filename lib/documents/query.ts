import type { DocumentCategory, Prisma } from "@prisma/client";
import { documentsListWhere, type DocumentActor } from "@/lib/documents/access";
import { isDocumentType } from "@/lib/documents/catalog";

export const DOCUMENT_PAGE_SIZE = 25;

export type DocumentLibraryFilters = {
  q?: string;
  category?: string;
  documentType?: string;
  employee?: string;
  customer?: string;
  contract?: string;
  delivery?: string;
  employeeId?: string;
  customerId?: string;
  contractId?: string;
  deliveryId?: string;
  verification?: string;
  archived?: string;
  expiresFrom?: string;
  expiresTo?: string;
  uploadedFrom?: string;
  uploadedTo?: string;
  extraction?: string;
  needsReview?: string;
  expirationWindow?: string;
  complianceState?: string;
  notificationState?: string;
};

function dayStart(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayEnd(value: string) {
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function documentLibraryWhere(
  ctx: DocumentActor,
  filters: DocumentLibraryFilters,
): Prisma.ManagedDocumentWhereInput {
  const acl = documentsListWhere(ctx);
  const extra: Prisma.ManagedDocumentWhereInput[] = [];
  const q = filters.q?.trim();
  if (q) extra.push({ name: { contains: q, mode: "insensitive" as const } });
  if (filters.category) extra.push({ category: filters.category as DocumentCategory });
  if (filters.documentType && isDocumentType(filters.documentType)) {
    extra.push({ documentType: filters.documentType });
  }
  if (filters.employeeId) extra.push({ employeeLinks: { some: { employeeId: filters.employeeId } } });
  if (filters.customerId) extra.push({ customerLinks: { some: { customerId: filters.customerId } } });
  if (filters.contractId) extra.push({ contractLinks: { some: { contractId: filters.contractId } } });
  if (filters.deliveryId) extra.push({ deliveryLinks: { some: { deliveryId: filters.deliveryId } } });
  const employeeName = filters.employee?.trim();
  if (employeeName) {
    extra.push({
      employeeLinks: {
        some: {
          employee: {
            OR: [
              { legalFirstName: { contains: employeeName, mode: "insensitive" as const } },
              { legalLastName: { contains: employeeName, mode: "insensitive" as const } },
              { employeeNumber: { contains: employeeName, mode: "insensitive" as const } },
            ],
          },
        },
      },
    });
  }
  const customerName = filters.customer?.trim();
  if (customerName) {
    extra.push({ customerLinks: { some: { customer: { legalName: { contains: customerName, mode: "insensitive" as const } } } } });
  }
  const contractName = filters.contract?.trim();
  if (contractName) {
    extra.push({
      contractLinks: {
        some: {
          OR: [
            { contract: { contractNumber: { contains: contractName, mode: "insensitive" as const } } },
            { contract: { customer: { legalName: { contains: contractName, mode: "insensitive" as const } } } },
          ],
        },
      },
    });
  }
  const deliveryName = filters.delivery?.trim();
  if (deliveryName) {
    extra.push({
      deliveryLinks: {
        some: {
          OR: [
            { delivery: { deliveryNumber: { contains: deliveryName, mode: "insensitive" as const } } },
            { delivery: { customer: { legalName: { contains: deliveryName, mode: "insensitive" as const } } } },
          ],
        },
      },
    });
  }
  if (filters.verification === "UNVERIFIED" || filters.verification === "VERIFIED" || filters.verification === "REJECTED") {
    extra.push({ verificationStatus: filters.verification });
  }
  if (filters.extraction === "OCR_DISABLED" || filters.extraction === "PENDING" || filters.extraction === "PROCESSING" || filters.extraction === "COMPLETED" || filters.extraction === "PARTIAL" || filters.extraction === "FAILED" || filters.extraction === "NOT_APPLICABLE") {
    extra.push({ extractionStatus: filters.extraction });
  }
  if (filters.needsReview === "1") {
    extra.push({
      OR: [
        { lifecycleStatus: "NEEDS_REVIEW" },
        { extractionStatus: { in: ["COMPLETED", "PARTIAL"] } },
        { verificationStatus: "UNVERIFIED", extractionStatus: { in: ["COMPLETED", "PARTIAL", "FAILED"] } },
      ],
    });
  }
  if (filters.archived === "1") {
    extra.push({ OR: [{ lifecycleStatus: "ARCHIVED" }, { archivedAt: { not: null } }] });
  } else if (filters.archived !== "all") {
    extra.push({ lifecycleStatus: { not: "ARCHIVED" }, archivedAt: null });
  }
  const expiresFrom = filters.expiresFrom ? dayStart(filters.expiresFrom) : null;
  const expiresTo = filters.expiresTo ? dayEnd(filters.expiresTo) : null;
  if (expiresFrom || expiresTo) {
    extra.push({
      expirationDate: {
        ...(expiresFrom ? { gte: expiresFrom } : {}),
        ...(expiresTo ? { lte: expiresTo } : {}),
      },
    });
  }
  const uploadedFrom = filters.uploadedFrom ? dayStart(filters.uploadedFrom) : null;
  const uploadedTo = filters.uploadedTo ? dayEnd(filters.uploadedTo) : null;
  if (uploadedFrom || uploadedTo) {
    extra.push({
      createdAt: {
        ...(uploadedFrom ? { gte: uploadedFrom } : {}),
        ...(uploadedTo ? { lte: uploadedTo } : {}),
      },
    });
  }
  const window = filters.expirationWindow;
  if (window === "expired") {
    extra.push({ expirationDate: { lt: new Date() } });
  } else if (window === "30" || window === "14" || window === "7") {
    const until = new Date();
    until.setUTCDate(until.getUTCDate() + Number(window));
    extra.push({ expirationDate: { gte: new Date(), lte: until } });
  }
  if (filters.complianceState === "expired") extra.push({ expirationDate: { lt: new Date() } });
  if (filters.complianceState === "expiring") {
    const until = new Date();
    until.setUTCDate(until.getUTCDate() + 30);
    extra.push({ expirationDate: { gte: new Date(), lte: until } });
  }
  if (filters.complianceState === "rejected") extra.push({ verificationStatus: "REJECTED" });
  if (filters.complianceState === "needs_review") extra.push({ lifecycleStatus: "NEEDS_REVIEW" });

  return extra.length ? { AND: [acl, ...extra] } : acl;
}

export const DOCUMENT_LIST_INCLUDE = {
  employeeLinks: {
    include: { employee: { select: { id: true, legalFirstName: true, legalLastName: true, employeeNumber: true } } },
  },
  customerLinks: { include: { customer: { select: { id: true, legalName: true } } } },
  contractLinks: {
    include: { contract: { select: { id: true, contractNumber: true, customerId: true, customer: { select: { legalName: true } } } } },
  },
  deliveryLinks: {
    include: { delivery: { select: { id: true, deliveryNumber: true, customerId: true, driverEmployeeId: true, customer: { select: { legalName: true } } } } },
  },
} satisfies Prisma.ManagedDocumentInclude;
