import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canViewCompanyLibraryAdmin } from "@/lib/compliance/library-access";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = { title: "Forms library" };

const SUGGESTED_TEMPLATES = [
  "Chain of custody",
  "Temperature log",
  "Vehicle inspection",
  "Spill-kit inspection",
  "Exposure report",
  "HIPAA incident report",
  "Training record",
  "ECP annual review",
  "Employee acknowledgment",
  "Incident report",
];

export default async function FormsLibraryPage() {
  const ctx = await requireAuth();
  if (!canViewCompanyLibraryAdmin(ctx.roles)) notFound();
  const forms = await prisma.companyDocument.findMany({
    where: { purpose: { in: ["FORM", "TEMPLATE"] } },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/compliance/library" className="text-sm font-semibold text-medical hover:underline">
          ← Compliance library
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-navy">Forms and templates</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Upload fillable or printable templates here. This phase stores the file and metadata only —
          it is not a dynamic form builder. Suggested operational templates are listed so owners know
          what to upload; none are fabricated or bundled in the repository.
        </p>
      </div>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Suggested template types</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {SUGGESTED_TEMPLATES.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Uploaded forms</h2>
        {forms.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No forms uploaded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {forms.map((form) => (
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
