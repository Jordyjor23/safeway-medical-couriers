import { createIncident, updateDeliveryStatus } from "@/app/(portal)/deliveries/actions";
import { prisma } from "@/lib/db";
import { requirePortal } from "@/lib/rbac";

const driverActions = [
  ["ACCEPTED", "Accept"],
  ["EN_ROUTE_PICKUP", "Start route"],
  ["ARRIVED_PICKUP", "Arrived pickup"],
  ["PICKED_UP", "Confirm pickup"],
  ["IN_TRANSIT", "In transit"],
  ["ARRIVED_DELIVERY", "Arrived delivery"],
  ["DELIVERED", "Confirm delivery"],
  ["EXCEPTION", "Report issue"],
] as const;

export default async function DriverDashboardPage() {
  const ctx = await requirePortal("driver");
  const deliveries = await prisma.delivery.findMany({
    where: { driver: { userId: ctx.user.id }, status: { notIn: ["CANCELLED"] } },
    include: { customer: true, events: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: [{ deliverBy: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy sm:text-3xl">Today&apos;s assignments</h1>
      <p className="text-sm text-muted">Only your assigned work is shown. Large buttons are designed for phone use.</p>
      {deliveries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper px-4 py-10 text-sm text-muted">
          No assignments yet.
        </p>
      ) : (
        deliveries.map((delivery) => (
          <article key={delivery.id} className="rounded-2xl border border-line bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-medical">{delivery.deliveryNumber}</p>
            <h2 className="mt-1 text-lg font-semibold text-navy">{delivery.status.replaceAll("_", " ")}</h2>
            <p className="mt-2 text-sm"><span className="font-semibold">Pickup:</span> {delivery.pickupAddress}</p>
            <p className="text-sm"><span className="font-semibold">Delivery:</span> {delivery.deliveryAddress}</p>
            <p className="text-sm text-muted">
              Pickup {delivery.pickupAt?.toLocaleString() ?? "TBD"} · Due {delivery.deliverBy?.toLocaleString() ?? "TBD"}
            </p>
            {delivery.customerInstructions ? <p className="mt-2 text-sm">{delivery.customerInstructions}</p> : null}
            {delivery.handlingInstructions ? <p className="text-sm">{delivery.handlingInstructions}</p> : null}
            {delivery.temperatureRequired ? <p className="text-sm">Temperature: {delivery.temperatureRequired}</p> : null}
            {delivery.chainOfCustodyRequired ? <p className="text-sm font-semibold text-navy">Chain of custody required</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {driverActions.map(([status, label]) => (
                <form action={updateDeliveryStatus} key={status}>
                  <input type="hidden" name="deliveryId" value={delivery.id} />
                  <input type="hidden" name="status" value={status} />
                  <button className="w-full min-h-11 rounded-xl bg-navy px-3 py-3 text-sm font-semibold text-white">
                    {label}
                  </button>
                </form>
              ))}
            </div>
            <form action={updateDeliveryStatus} className="mt-3 grid gap-2">
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <input type="hidden" name="status" value="DELIVERED" />
              <input name="recipientName" placeholder="Recipient name" className="rounded-lg border border-line px-3 py-3 text-sm" />
              <input name="deliveryNotes" placeholder="Delivery notes" className="rounded-lg border border-line px-3 py-3 text-sm" />
              <button className="min-h-11 rounded-xl bg-medical px-3 py-3 text-sm font-semibold text-white">
                Complete with recipient
              </button>
            </form>
            <form action={createIncident} className="mt-4 grid gap-2 border-t border-line pt-4">
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <select name="type" className="rounded-lg border border-line px-3 py-3 text-sm">
                <option value="PACKAGE">Damaged package</option>
                <option value="TEMPERATURE">Temperature excursion</option>
                <option value="VEHICLE">Vehicle issue</option>
                <option value="EXPOSURE">Exposure / safety</option>
                <option value="SECURITY">Security incident</option>
              </select>
              <input name="title" required placeholder="Issue title" className="rounded-lg border border-line px-3 py-3 text-sm" />
              <textarea name="body" required placeholder="What happened?" className="rounded-lg border border-line px-3 py-3 text-sm" />
              <button className="min-h-11 rounded-xl border border-line px-3 py-3 text-sm font-semibold text-navy">
                Report issue
              </button>
            </form>
          </article>
        ))
      )}
    </div>
  );
}
