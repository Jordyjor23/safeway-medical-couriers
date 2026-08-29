import { expirationLabel } from "@/lib/documents/display";
import { isActiveDocument } from "@/lib/documents/lifecycle";
import { documentSatisfiesRequirement } from "@/lib/documents/qualifying-document";

export type BucketedDocument = {
  documentType: string | null;
  lifecycleStatus: Parameters<typeof expirationLabel>[0]["lifecycleStatus"];
  verificationStatus: Parameters<typeof expirationLabel>[0]["verificationStatus"];
  expirationDate?: Date | null;
  archivedAt?: Date | null;
  suggestedTypeStatus?: string | null;
  employeeLinks?: unknown[];
  customerLinks?: unknown[];
  contractLinks?: unknown[];
  deliveryLinks?: unknown[];
};

export function employeeDocumentBuckets<T extends BucketedDocument>(documents: T[], now = new Date()) {
  const archived = documents.filter((document) => document.archivedAt || document.lifecycleStatus === "ARCHIVED");
  const live = documents.filter((document) => isActiveDocument(document));
  const rejected = live.filter(
    (document) => document.lifecycleStatus === "REJECTED" || document.verificationStatus === "REJECTED",
  );
  const expired = live.filter((document) => expirationLabel(document, now) === "Expired");
  const expiringSoon = live.filter((document) => expirationLabel(document, now) === "Expiring Soon");
  const uploaded = live.filter((document) => {
    if (rejected.includes(document)) return false;
    const label = expirationLabel(document, now);
    return label !== "Expired" && label !== "Expiring Soon";
  });
  const needsAction = [...new Set([...rejected, ...expired, ...expiringSoon])];
  return { uploaded, expired, expiringSoon, archived, rejected, needsAction };
}

export function missingRequirementLabels(args: {
  rules: { documentType: string; requirement: { name: string }; appliesTo?: string }[];
  records: { status: string; requirement: { name: string } }[];
  documents: BucketedDocument[];
  now?: Date;
}) {
  if (!args.rules.length && !args.records.some((record) => record.status === "MISSING")) return [];
  const now = args.now ?? new Date();
  const qualifyingTypes = new Set(
    args.documents
      .filter((document) =>
        documentSatisfiesRequirement(
          {
            documentType: document.documentType,
            verificationStatus: document.verificationStatus,
            suggestedTypeStatus: document.suggestedTypeStatus,
            lifecycleStatus: document.lifecycleStatus,
            expirationDate: document.expirationDate,
            archivedAt: document.archivedAt,
            employeeLinks: document.employeeLinks ?? [],
            customerLinks: document.customerLinks ?? [],
            contractLinks: document.contractLinks ?? [],
            deliveryLinks: document.deliveryLinks ?? [],
          },
          now,
        ),
      )
      .map((document) => document.documentType)
      .filter((type): type is string => Boolean(type)),
  );
  const missing = new Map<string, string>();
  for (const rule of args.rules) {
    if (!qualifyingTypes.has(rule.documentType)) missing.set(rule.requirement.name, rule.requirement.name);
  }
  for (const record of args.records) {
    if (record.status === "MISSING") missing.set(record.requirement.name, record.requirement.name);
  }
  return [...missing.values()];
}
