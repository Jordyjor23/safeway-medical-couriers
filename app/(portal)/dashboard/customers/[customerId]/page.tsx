import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  await requirePermission("customers.view");
  const { customerId } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { contacts: true, contracts: true },
  });
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-navy">{customer.legalName}</h1>
        <p className="text-muted">{customer.status.replaceAll("_", " ")} · {customer.customerType.replaceAll("_", " ")}</p>
      </div>
      <section className="rounded-2xl border border-line bg-paper p-5 text-sm">
        <p>Email: {customer.email ?? "—"}</p>
        <p>Phone: {customer.phone ?? "—"}</p>
        <p>Website: {customer.website ?? "—"}</p>
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Contracts</h2>
        <ul className="mt-2 text-sm">
          {customer.contracts.length === 0 ? <li className="text-muted">No associated contracts.</li> : customer.contracts.map((contract) => (
            <li key={contract.id}>{contract.contractNumber} · {contract.status}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
