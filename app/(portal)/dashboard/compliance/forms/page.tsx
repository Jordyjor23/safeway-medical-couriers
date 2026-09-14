import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComplianceLibraryNav } from "@/components/portal/ComplianceLibraryNav";
import { canViewCompanyLibraryAdmin } from "@/lib/compliance/library-access";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = { title: "Forms register" };

export default async function FormsLibraryPage() {
  const ctx = await requireAuth();
  if (!canViewCompanyLibraryAdmin(ctx.roles)) notFound();
  const [forms, uploaded] = await Promise.all([
    prisma.controlledDocument.findMany({
      where: { documentType: { in: ["FORM", "TEMPLATE"] } },
      orderBy: { controlledDocumentId: "asc" },
    }),
    prisma.companyDocument.findMany({
      where: { purpose: { in: ["FORM", "TEMPLATE"] } },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-navy">Forms and records register</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          SC-FRM-001 through SC-FRM-020 are controlled templates only. This is not a dynamic form
          builder. Uploaded fillable files appear below after Owner/Admin upload.
        </p>
        <ComplianceLibraryNav current="/dashboard/compliance/forms" />
      </div>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Controlled forms register</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {forms.map((form) => (
            <li key={form.id}>
              <Link href={`/dashboard/compliance/register/${form.id}`} className="font-medium text-navy hover:text-medical">
                {form.controlledDocumentId} · {form.title}
              </Link>
              <span className="text-muted"> · {form.status}{form.active ? "" : " · inactive"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Uploaded form files</h2>
        {uploaded.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No separate form files uploaded yet. Sections share the master ManagedDocument after SC-MCM-001 upload.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {uploaded.map((form) => (
              <li key={form.id}>
                <Link href={`/dashboard/compliance/library/${form.id}`} className="font-medium text-navy hover:text-medical">
                  {form.title} · {form.revision} · {form.publicationStatus}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
