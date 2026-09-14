import type { Metadata } from "next";
import Link from "next/link";
import { uploadCompanyLibraryAction } from "@/app/(portal)/dashboard/compliance/library/actions";
import {
  COMPANY_DOCUMENT_PURPOSES,
  COMPANY_LIBRARY_CATEGORIES,
  COMPANY_PUBLICATION_STATUSES,
} from "@/lib/compliance/library-catalog";
import { canManageCompanyLibrary, canViewCompanyLibraryAdmin } from "@/lib/compliance/library-access";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Compliance library" };

export default async function ComplianceLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; purpose?: string; status?: string }>;
}) {
  const ctx = await requireAuth();
  if (!canViewCompanyLibraryAdmin(ctx.roles)) notFound();
  const params = await searchParams;
  const documents = await prisma.companyDocument.findMany({
    where: {
      libraryCategory: params.category ? (params.category as never) : undefined,
      purpose: params.purpose ? (params.purpose as never) : undefined,
      publicationStatus: params.status ? (params.status as never) : undefined,
    },
    include: { document: { select: { id: true, contentSha256: true, uploadedAt: true, originalFileName: true } } },
    orderBy: [{ title: "asc" }, { revision: "desc" }],
  });
  const canUpload = canManageCompanyLibrary(ctx.roles);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Compliance</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">Company document library</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Upload Safeway-approved policies, SOPs, forms, and templates into private storage. Files are
          never placed in the public website directory. This library starts empty until an owner
          uploads real documents — no placeholder manuals are stored in the application.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/compliance" className="font-semibold text-medical hover:underline">
            Compliance dashboard
          </Link>
          <Link href="/dashboard/compliance/forms" className="font-semibold text-medical hover:underline">
            Forms library
          </Link>
        </div>
      </div>

      <form className="grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-4">
        <select name="category" defaultValue={params.category ?? ""} className="rounded-lg border border-line px-3 py-2 text-sm">
          <option value="">All categories</option>
          {COMPANY_LIBRARY_CATEGORIES.map((value) => (
            <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
          ))}
        </select>
        <select name="purpose" defaultValue={params.purpose ?? ""} className="rounded-lg border border-line px-3 py-2 text-sm">
          <option value="">All types</option>
          {COMPANY_DOCUMENT_PURPOSES.map((value) => (
            <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-line px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {COMPANY_PUBLICATION_STATUSES.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>

      {canUpload ? (
        <form action={uploadCompanyLibraryAction} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold text-navy sm:col-span-2">Upload company document</h2>
          <p className="text-sm text-muted sm:col-span-2">
            Use a new upload to replace a document. The previous version is preserved and marked superseded.
          </p>
          <input name="title" required placeholder="Title" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="documentNumber" placeholder="Document number (optional)" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="revision" placeholder="Revision (e.g. 1.0)" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="responsibleRole" placeholder="Responsible role (e.g. COMPLIANCE_ADMIN)" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <select name="purpose" required className="rounded-lg border border-line px-3 py-2 text-sm">
            {COMPANY_DOCUMENT_PURPOSES.map((value) => (
              <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
            ))}
          </select>
          <select name="libraryCategory" required className="rounded-lg border border-line px-3 py-2 text-sm">
            {COMPANY_LIBRARY_CATEGORIES.map((value) => (
              <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
            ))}
          </select>
          <label className="text-sm">
            Effective date
            <input name="effectiveDate" type="date" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            Review date
            <input name="reviewDate" type="date" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
          </label>
          <textarea name="description" placeholder="Description" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
          <input name="file" type="file" required className="sm:col-span-2 text-sm" />
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Upload to private storage</button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Revision</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={5}>
                  No company documents yet. Owner/Admin can upload approved Safeway files here.
                </td>
              </tr>
            ) : (
              documents.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/compliance/library/${row.id}`} className="font-medium text-navy hover:text-medical">
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.purpose.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{row.libraryCategory.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{row.revision}</td>
                  <td className="px-4 py-3">{row.publicationStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
