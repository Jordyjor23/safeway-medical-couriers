import type { Metadata } from "next";
import { deleteBusinessDocument, uploadBusinessDocument } from "@/app/(portal)/dashboard/documents/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Documents" };

const categories = [
  "CORPORATE",
  "INSURANCE",
  "CUSTOMER_CONTRACTS",
  "EMPLOYEE_DOCUMENTS",
  "APPLICANT_DOCUMENTS",
  "DRIVER_DOCUMENTS",
  "COMPLIANCE",
  "TRAINING",
  "VEHICLE",
  "POLICIES",
  "SOPS",
];

export default async function DocumentsPage() {
  const ctx = await requirePermission("documents.view");
  const documents = await prisma.managedDocument.findMany({ orderBy: { createdAt: "desc" } });
  const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Documents</h1>
      <p className="mt-2 text-sm text-muted">
        Files are stored privately. They are not placed in the public website directory.
      </p>
      {!blobConfigured ? (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          File storage is not configured yet. You can still manage names and expiration after a
          storage token is added.
        </p>
      ) : null}
      {hasPermission(ctx, "documents.upload") && blobConfigured ? (
        <form action={uploadBusinessDocument} className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
          <input name="name" placeholder="Document name" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <select name="category" className="rounded-lg border border-line px-3 py-2 text-sm">
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <input name="file" type="file" required className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
          <label className="text-sm">
            Expiration{" "}
            <input name="expirationDate" type="date" className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:w-fit">
            Upload
          </button>
        </form>
      ) : null}
      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
        {documents.length === 0 ? (
          <li className="px-4 py-8 text-sm text-muted">No documents yet.</li>
        ) : (
          documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-navy">{document.name}</p>
                <p className="text-muted">
                  {document.category.replaceAll("_", " ")} · {document.status.replaceAll("_", " ")} ·
                  expires {document.expirationDate?.toLocaleDateString() ?? "n/a"}
                </p>
              </div>
              {hasPermission(ctx, "documents.delete") ? (
                <form action={deleteBusinessDocument}>
                  <input type="hidden" name="documentId" value={document.id} />
                  <button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:border-medical">
                    Delete
                  </button>
                </form>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
