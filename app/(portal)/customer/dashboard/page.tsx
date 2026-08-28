import { forbidden } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePortal, assertSameCustomer } from "@/lib/rbac";

export default async function CustomerDashboardPage() {
  const ctx = await requirePortal("customer");
  if (!ctx.user.customerId) forbidden();
  assertSameCustomer(ctx, ctx.user.customerId);
  const [customer, deliveries, contracts] = await Promise.all([
    prisma.customer.findUnique({ where: { id: ctx.user.customerId } }),
    prisma.delivery.findMany({
      where: { customerId: ctx.user.customerId },
      include: { events: { orderBy: { createdAt: "desc" }, take: 3 } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contract.findMany({
      where: { customerId: ctx.user.customerId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-navy">{customer?.legalName ?? "Customer portal"}</h1>
        <p className="text-sm text-muted">{customer?.clientNumber} · only your organization&apos;s records are shown.</p>
      </div>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Current shipments</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {deliveries.length === 0 ? (
            <li className="text-muted">No shipments yet.</li>
          ) : (
            deliveries.map((delivery) => (
              <li key={delivery.id}>
                <p className="font-semibold text-navy">{delivery.deliveryNumber} · {delivery.status.replaceAll("_", " ")}</p>
                <p>{delivery.pickupAddress} → {delivery.deliveryAddress}</p>
                {delivery.events[0] ? <p className="text-muted">Last update: {delivery.events[0].kind}</p> : null}
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Contracts</h2>
        <ul className="mt-3 text-sm">
          {contracts.length === 0 ? (
            <li className="text-muted">No contracts available.</li>
          ) : (
            contracts.map((contract) => (
              <li key={contract.id}>{contract.contractNumber} · {contract.status.replaceAll("_", " ")}</li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
