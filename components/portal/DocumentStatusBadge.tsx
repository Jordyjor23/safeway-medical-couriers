import { expirationLabel, verificationLabel } from "@/lib/documents/display";

export function DocumentStatusBadge({
  document,
}: {
  document: {
    expirationDate?: Date | null;
    lifecycleStatus: Parameters<typeof expirationLabel>[0]["lifecycleStatus"];
    verificationStatus: Parameters<typeof expirationLabel>[0]["verificationStatus"];
    extractionStatus?: string | null;
    archivedAt?: Date | null;
    isSensitive?: boolean;
  };
}) {
  const expiration = expirationLabel(document);
  const verification = verificationLabel(document.verificationStatus);
  const extraction = document.extractionStatus && document.extractionStatus !== "OCR_DISABLED"
    ? document.extractionStatus.replaceAll("_", " ")
    : null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className="rounded-full bg-ice px-2 py-0.5 text-xs font-semibold text-navy">{expiration}</span>
      <span className="rounded-full bg-ice px-2 py-0.5 text-xs font-semibold text-navy">{verification}</span>
      {extraction ? (
        <span className="rounded-full bg-ice px-2 py-0.5 text-xs font-semibold text-navy">{extraction}</span>
      ) : null}
      {document.isSensitive ? (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">Sensitive</span>
      ) : null}
    </span>
  );
}
