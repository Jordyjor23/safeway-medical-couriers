import type { Metadata } from "next";
import Link from "next/link";
import { createContract } from "@/app/(portal)/dashboard/contracts/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Contracts" };

export default async function ContractsPage() {
  const ctx = await requirePermission("contracts.view");
  const [contracts, customers] = await Promise.all([
    prisma.contract.findMany({ include: { customer: true }, orderBy: { updatedAt: "desc" } }),
    prisma.customer.findMany({ orderBy: { legalName: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Contracts</h1>
      <p className="mt-2 text-sm text-muted">
        E-signature is architected for a future provider. This screen tracks status, dates, and files.
      </p>
      {hasPermission(ctx, "contracts.edit") ? (
        <form action={createContract} className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
          <select name="customerId" required className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.legalName}
              </option>
            ))}
          </select>
          <select name="contractType" className="rounded-lg border border-line px-3 py-2 text-sm">
            {["MASTER_SERVICE", "STATEMENT_OF_WORK", "AMENDMENT", "NDA", "BAA", "OTHER"].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <input name="serviceType" placeholder="Service type" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <select name="status" className="rounded-lg border border-line px-3 py-2 text-sm">
            {["DRAFT", "UNDER_REVIEW", "SENT", "NEGOTIATING", "AWAITING_SIGNATURE", "ACTIVE"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <label className="text-sm">
            Effective <input name="effectiveDate" type="date" className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            Expiration <input name="expirationDate" type="date" className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:col-span-2 sm:w-fit">
            Add contract
          </button>
        </form>
      ) : null}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expires</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={4}>
                  No contracts yet.
                </td>
              </tr>
            ) : (
              contracts.map((contract) => (
                <tr key={contract.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/dashboard/contracts/${contract.id}`} className="font-medium text-navy hover:text-medical">
                      {contract.contractNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/customers/${contract.customerId}`} className="hover:text-medical">
                      {contract.customer.legalName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{contract.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{contract.expirationDate?.toLocaleDateString() ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
