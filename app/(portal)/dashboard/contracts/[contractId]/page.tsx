import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateContract } from "@/app/(portal)/dashboard/contracts/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Contract" };

const fieldClass = "mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm";
const contractTypes = ["MASTER_SERVICE", "STATEMENT_OF_WORK", "AMENDMENT", "NDA", "BAA", "OTHER"];
const contractStatuses = [
  "DRAFT",
  "UNDER_REVIEW",
  "SENT",
  "NEGOTIATING",
  "AWAITING_SIGNATURE",
  "ACTIVE",
  "EXPIRING",
  "RENEWED",
  "TERMINATED",
  "EXPIRED",
];

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const ctx = await requirePermission("contracts.view");
  const { contractId } = await params;
  const [contract, customers] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: contractId },
      include: { customer: true },
    }),
    prisma.customer.findMany({ orderBy: { legalName: "asc" } }),
  ]);
  if (!contract) notFound();
  const canEdit = hasPermission(ctx, "contracts.edit");
  const save = updateContract.bind(null, contract.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/contracts" className="text-sm font-semibold text-medical hover:underline">
          ← Contracts
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-navy">{contract.contractNumber}</h1>
        <p className="text-muted">
          <Link href={`/dashboard/customers/${contract.customerId}`} className="hover:text-medical">
            {contract.customer.legalName}
          </Link>{" "}
          · {contract.status.replaceAll("_", " ")}
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-paper p-5">
        {canEdit ? (
          <form action={save} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-navy">
              Customer
              <select name="customerId" defaultValue={contract.customerId} className={fieldClass}>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.legalName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Type
              <select name="contractType" defaultValue={contract.contractType} className={fieldClass}>
                {contractTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Service type
              <input name="serviceType" defaultValue={contract.serviceType ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Status
              <select name="status" defaultValue={contract.status} className={fieldClass}>
                {contractStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Effective
              <input name="effectiveDate" type="date" defaultValue={isoDate(contract.effectiveDate)} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Expiration
              <input name="expirationDate" type="date" defaultValue={isoDate(contract.expirationDate)} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Renewal
              <input name="renewalDate" type="date" defaultValue={isoDate(contract.renewalDate)} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Billing terms
              <input name="billingTerms" defaultValue={contract.billingTerms ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Payment terms
              <input name="paymentTerms" defaultValue={contract.paymentTerms ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Notes
              <textarea name="notes" rows={4} defaultValue={contract.notes ?? ""} className={fieldClass} />
            </label>
            <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
              Save contract
            </button>
          </form>
        ) : (
          <div className="space-y-1 text-sm">
            <p>Type: {contract.contractType.replaceAll("_", " ")}</p>
            <p>Expires: {contract.expirationDate?.toLocaleDateString() ?? "—"}</p>
            <p>{contract.notes ?? "No notes."}</p>
          </div>
        )}
      </section>
    </div>
  );
}
