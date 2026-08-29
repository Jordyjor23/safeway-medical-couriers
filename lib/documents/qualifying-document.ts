import type { DocumentLifecycleStatus, DocumentVerificationStatus } from "@prisma/client";
import { documentMayCountTowardRequirement } from "@/lib/documents/compliance-gate";
import { isActiveDocument } from "@/lib/documents/lifecycle";

export function documentSatisfiesRequirement(
  document: {
    documentType: string | null;
    verificationStatus: DocumentVerificationStatus;
    suggestedTypeStatus?: string | null;
    lifecycleStatus: DocumentLifecycleStatus;
    expirationDate?: Date | null;
    archivedAt?: Date | null;
    employeeLinks: unknown[];
    customerLinks: unknown[];
    contractLinks: unknown[];
    deliveryLinks: unknown[];
  },
  now = new Date(),
) {
  if (!isActiveDocument(document)) return false;
  if (document.expirationDate && document.expirationDate.getTime() < now.getTime()) return false;
  return documentMayCountTowardRequirement(document);
}

export function requirementAppliesToEmployee(
  appliesTo: string | null | undefined,
  employee: { isDriver?: boolean; classification?: string | null; jobTitle?: string | null },
) {
  const scope = (appliesTo ?? "ALL").trim().toUpperCase();
  if (!scope || scope === "ALL") return true;
  if (scope === "DRIVER" || scope === "DRIVERS") return Boolean(employee.isDriver);
  if (scope === "EMPLOYEE") return true;
  if (employee.classification && employee.classification.toUpperCase() === scope) return true;
  if (employee.jobTitle && employee.jobTitle.toUpperCase().includes(scope)) return true;
  return false;
}
