import Link from "next/link";
import { createDelivery } from "@/app/(portal)/deliveries/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePortal } from "@/lib/rbac";

export default async function DispatchDashboardPage() {
  const ctx = await requirePortal("dispatch");
  const [deliveries, drivers, customers] = await Promise.all([
    prisma.delivery.findMany({
      include: { customer: true, driver: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.employee.findMany({
      where: { isDriver: true, status: { in: ["ACTIVE", "PENDING_ONBOARDING"] } },
      orderBy: { legalLastName: "asc" },
    }),
    prisma.customer.findMany({ orderBy: { legalName: "asc" } }),
  ]);
  const canCreate = hasPermission(ctx, "delivery.create");

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Dispatch board</h1>
      <p className="mt-2 text-sm text-muted">Assign pickups and deliveries. HR files and financial settings are not available here.</p>
      {canCreate ? (
        <form action={createDelivery} className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
          <select name="customerId" required className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.legalName}
              </option>
            ))}
          </select>
          <select name="driverEmployeeId" className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">Assign driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.legalFirstName} {driver.legalLastName}
              </option>
            ))}
          </select>
          <input name="pickupAddress" required placeholder="Pickup address" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="deliveryAddress" required placeholder="Delivery address" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <label className="text-sm">Pickup <input name="pickupAt" type="datetime-local" className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
          <label className="text-sm">Deliver by <input name="deliverBy" type="datetime-local" className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
          <input name="shipmentType" placeholder="Shipment type" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="temperatureRequired" placeholder="Temperature requirements" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <input name="customerInstructions" placeholder="Customer instructions" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
          <input name="handlingInstructions" placeholder="Handling / chain-of-custody notes" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input name="chainOfCustodyRequired" type="checkbox" /> Chain of custody required
          </label>
          <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:w-fit">Create assignment</button>
        </form>
      ) : null}
      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
        {deliveries.length === 0 ? (
          <li className="px-4 py-8 text-sm text-muted">No deliveries yet.</li>
        ) : (
          deliveries.map((delivery) => (
            <li key={delivery.id} className="px-4 py-3 text-sm">
              <p className="font-semibold text-navy">
                <Link href={`/dispatch/deliveries/${delivery.id}`} className="hover:text-medical">
                  {delivery.deliveryNumber}
                </Link>{" "}
                · {delivery.status.replaceAll("_", " ")}
              </p>
              <p className="text-muted">
                {delivery.customer.legalName} · {delivery.driver ? `${delivery.driver.legalFirstName} ${delivery.driver.legalLastName}` : "Unassigned"}
              </p>
              <p>{delivery.pickupAddress} → {delivery.deliveryAddress}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
