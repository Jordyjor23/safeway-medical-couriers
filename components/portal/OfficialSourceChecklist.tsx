import { OFFICIAL_SOURCE_PACKAGES } from "@/lib/compliance/register-catalog";

export function OfficialSourceChecklist() {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="text-lg font-semibold text-navy">Owner upload checklist (3 official files)</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Upload these files into private Blob from a machine that already has non-production storage
        credentials. Do not commit the ZIP or binaries to Git. Keep each file DRAFT until owner
        approval and effective-date review are complete. Acknowledgments are not e-signatures. Do
        not publish or activate until those fields are complete.
      </p>
      <ol className="mt-4 space-y-4 text-sm">
        {OFFICIAL_SOURCE_PACKAGES.map((source, index) => (
          <li key={source.key}>
            <p className="font-semibold text-navy">
              {index + 1}. {source.title} ({source.documentNumber} Rev {source.revision})
            </p>
            <p className="mt-1 break-all text-muted">{source.filename}</p>
            <p className="mt-1 text-xs text-muted">
              SHA-256 {source.expectedSha256} · {source.expectedBytes} bytes
            </p>
            <p className="mt-1 text-muted">
              Purpose <span className="font-medium text-navy">{source.purpose}</span> · category{" "}
              <span className="font-medium text-navy">{source.libraryCategory.replaceAll("_", " ")}</span>
              {source.suggestedAssignment
                ? ` · suggested assignment ${source.suggestedAssignment.replaceAll("_", " ")} after owner approval`
                : ""}
            </p>
            <p className="mt-1 text-muted">
              Maps to {source.controlledDocumentIds.join(", ")} sharing one ManagedDocument.
            </p>
            <p className="mt-1 text-muted">{source.notes}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
