import type { Metadata } from "next";
import Link from "next/link";
import { createCustomer } from "@/app/(portal)/dashboard/customers/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Customers" };

const types = ["HOSPITAL", "LABORATORY", "PHARMACY", "CLINIC", "DENTAL", "HOME_HEALTHCARE", "MEDICAL_SUPPLIER", "VETERINARY", "RESEARCH", "OTHER_BUSINESS"];
const statuses = ["PROSPECT", "LEAD", "PROPOSAL_SENT", "NEGOTIATION", "ACTIVE", "INACTIVE", "FORMER"];

export default async function CustomersPage() {
  const ctx = await requirePermission("customers.view");
  const customers = await prisma.customer.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Customers</h1>
      {hasPermission(ctx, "customers.edit") ? (
        <form action={createCustomer} className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
          <input name="legalName" required placeholder="Legal name" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="dba" placeholder="DBA" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <select name="customerType" className="rounded-lg border border-line px-3 py-2 text-sm">
            {types.map((type) => <option key={type}>{type}</option>)}
          </select>
          <select name="status" className="rounded-lg border border-line px-3 py-2 text-sm">
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
          <input name="email" type="email" placeholder="Email" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="phone" placeholder="Phone" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:col-span-2 sm:w-fit">Add customer</button>
        </form>
      ) : null}
      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
        {customers.length === 0 ? <li className="px-4 py-8 text-sm text-muted">No customers yet.</li> : customers.map((customer) => (
          <li key={customer.id} className="px-4 py-3">
            <Link href={`/dashboard/customers/${customer.id}`} className="font-medium text-navy hover:text-medical">{customer.legalName}</Link>
            <p className="text-sm text-muted">{customer.status.replaceAll("_", " ")} · {customer.customerType.replaceAll("_", " ")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
