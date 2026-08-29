import type { NotificationType } from "@prisma/client";
import { appOrigin } from "@/lib/app-url";
import { labelDocumentType } from "@/lib/documents/catalog";
import { documentDetailHref } from "@/lib/documents/paths";

function sentenceTypeLabel(type: string | null | undefined) {
  const label = labelDocumentType(type).replace(/^—$/, "document");
  const first = label.split(" ")[0] ?? "";
  if (first.length > 1 && first === first.toUpperCase()) return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

const SENSITIVE_PATTERN =
  /\b(\d{3}-\d{2}-\d{4}|\d{9}|[A-Z0-9]{8,}|policy\s*#|license\s*#|dob|date of birth|ssn|blob\.vercel|https?:\/\/[^/\s]*blob)\b/i;

export function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function portalHrefForRecipient(args: {
  roles: string[];
  documentId?: string | null;
}) {
  const origin = appOrigin();
  if (args.roles.includes("CUSTOMER")) return `${origin}/customer/dashboard`;
  if (args.roles.includes("DRIVER") || args.roles.includes("EMPLOYEE")) {
    return `${origin}/employee/dashboard`;
  }
  if (args.roles.includes("OPERATIONS_MANAGER") && !args.roles.includes("ADMIN") && !args.roles.includes("OWNER")) {
    return args.documentId ? `${origin}${documentDetailHref("operations", args.documentId)}` : `${origin}/operations/documents`;
  }
  if (args.documentId) return `${origin}${documentDetailHref("staff", args.documentId)}`;
  return `${origin}/dashboard/documents`;
}

export function documentNotificationCopy(args: {
  type: NotificationType;
  documentName?: string | null;
  documentType?: string | null;
  expirationDate?: Date | null;
  requirementName?: string | null;
  rejectionReason?: string | null;
  daysRemaining?: number | null;
}) {
  const typeLabel = sentenceTypeLabel(args.documentType);
  const expires = args.expirationDate ? formatLongDate(args.expirationDate) : null;
  if (args.type === "DOCUMENT_EXPIRED") {
    return {
      title: `${typeLabel} expired`,
      body: expires ? `Your ${typeLabel} document expired on ${expires}.` : `Your ${typeLabel} document has expired.`,
    };
  }
  if (args.type === "DOCUMENT_EXPIRING") {
    const when = expires ?? "soon";
    const window =
      args.daysRemaining != null && args.daysRemaining > 0 ? ` in ${args.daysRemaining} day${args.daysRemaining === 1 ? "" : "s"}` : "";
    return {
      title: `${typeLabel} expires${window}`,
      body: `Your ${typeLabel} document expires on ${when}.`,
    };
  }
  if (args.type === "REQUIRED_DOCUMENT_MISSING") {
    const requirement = args.requirementName ?? typeLabel;
    return {
      title: `Required document missing`,
      body: `A required ${requirement} document is missing.`,
    };
  }
  if (args.type === "DOCUMENT_REJECTED") {
    const reason = sanitizePublicText(args.rejectionReason) ?? "See the portal for the rejection reason.";
    return {
      title: `${typeLabel} was rejected`,
      body: `Your ${typeLabel} document was rejected. Reason: ${reason} Upload a replacement in the portal.`,
    };
  }
  if (args.type === "DOCUMENT_NEEDS_REVIEW") {
    return {
      title: "Document needs review",
      body: `A ${typeLabel} document is waiting for review.`,
    };
  }
  if (args.type === "COMPLIANCE_NON_COMPLIANT") {
    const requirement = args.requirementName ?? typeLabel;
    return {
      title: "Compliance action: non-compliant",
      body: `${requirement} does not have a qualifying verified document.`,
    };
  }
  return {
    title: "Compliance action required",
    body: args.requirementName
      ? `${args.requirementName} needs attention.`
      : `A required ${typeLabel} document needs attention.`,
  };
}

export function documentNotificationEmailHtml(args: {
  body: string;
  href: string;
}) {
  const body = sanitizePublicText(args.body) ?? "Open the portal for details.";
  return `<p>${escapeHtml(body)}</p><p><a href="${escapeHtml(args.href)}">Open the portal</a></p>`;
}

export function sanitizePublicText(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  if (SENSITIVE_PATTERN.test(trimmed)) {
    return trimmed.replace(SENSITIVE_PATTERN, "[redacted]").slice(0, 280);
  }
  return trimmed.slice(0, 280);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
