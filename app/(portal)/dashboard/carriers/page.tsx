import type { Metadata } from "next";
import Link from "next/link";
import { createCarrierPartner } from "@/app/(portal)/dashboard/carriers/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Carrier partners" };

const partnerTypes = [
  "COURIER_FLEET",
  "FREIGHT_CARRIER",
  "OWNER_OPERATOR",
  "LOGISTICS_PROVIDER",
  "SUBCONTRACTOR",
];

const statuses = ["PROSPECT", "ONBOARDING", "QUALIFIED", "ACTIVE", "SUSPENDED", "INACTIVE"];

export default async function CarrierPartnersPage() {
  const ctx = await requirePermission("carrierPartners.view");
  const partners = await prisma.carrierPartner.findMany({
    include: { _count: { select: { contractAssignments: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const activeCount = partners.filter((partner) => partner.status === "ACTIVE").length;
  const qualifiedCount = partners.filter((partner) => partner.status === "QUALIFIED").length;
  const onboardingCount = partners.filter((partner) => partner.status === "ONBOARDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-navy">Carrier partners</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Build regional capacity without owning every vehicle. Track courier fleets, freight
          carriers, subcontractors, compliance readiness, equipment, coverage, rates, and contract assignments.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Active", activeCount],
          ["Qualified", qualifiedCount],
          ["Onboarding", onboardingCount],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-line bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-navy">{value}</p>
          </div>
        ))}
      </div>

      {hasPermission(ctx, "carrierPartners.edit") ? (
        <form action={createCarrierPartner} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="font-semibold text-navy">Add carrier / subcontractor</h2>
            <p className="mt-1 text-xs text-muted">
              Start with what you know. The full profile can be completed during onboarding.
            </p>
          </div>
          <input name="legalName" required placeholder="Legal business name" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="contactName" placeholder="Primary contact" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <select name="partnerType" className="rounded-lg border border-line px-3 py-2 text-sm">
            {partnerTypes.map((type) => (
              <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
            ))}
          </select>
          <select name="status" className="rounded-lg border border-line px-3 py-2 text-sm">
            {statuses.map((status) => (
              <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
            ))}
          </select>
          <input name="contactEmail" type="email" placeholder="Contact email" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="contactPhone" placeholder="Contact phone" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="headquartersState" placeholder="Home state (e.g. OH)" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="serviceRegions" placeholder="Coverage (e.g. Midwest / Washington)" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="equipment" placeholder="Equipment (Sprinter vans, SUVs, 26' box truck...)" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:col-span-2">
            Add partner
          </button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Coverage / equipment</th>
              <th className="px-4 py-3">Contracts</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-muted">No carrier partners yet.</td></tr>
            ) : partners.map((partner) => (
              <tr key={partner.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/carriers/${partner.id}`} className="font-semibold text-navy hover:text-medical">
                    {partner.legalName}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-muted">{partner.partnerNumber}</p>
                </td>
                <td className="px-4 py-3">{partner.partnerType.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{partner.status.replaceAll("_", " ")}</td>
                <td className="max-w-md px-4 py-3 text-xs text-muted">
                  {[partner.serviceRegions, partner.equipment].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3">{partner._count.contractAssignments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
