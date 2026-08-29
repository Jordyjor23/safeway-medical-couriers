import { documentFileHref } from "@/lib/documents/display";

export function DocumentPreview({
  documentId,
  mimeType,
  canDownload,
}: {
  documentId: string;
  mimeType: string | null;
  canDownload: boolean;
}) {
  if (!canDownload) return null;
  const href = documentFileHref(documentId);
  const mime = (mimeType ?? "").toLowerCase();
  if (mime === "application/pdf") {
    return (
      <iframe title="Document preview" src={href} className="mt-3 h-[32rem] w-full rounded-xl border border-line bg-white" />
    );
  }
  if (mime === "image/jpeg" || mime === "image/png") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={href} alt="Uploaded document" className="mt-3 max-h-[32rem] w-full rounded-xl border border-line object-contain bg-white" />
    );
  }
  return (
    <p className="mt-3 text-sm text-muted">
      This format cannot be previewed here. Use View / Download.
    </p>
  );
}
