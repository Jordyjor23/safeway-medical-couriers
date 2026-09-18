import Link from "next/link";
import {
  assignDeliveryCourier,
  createDelivery,
  createDeliveryFromRouteTemplate,
} from "@/app/(portal)/deliveries/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePortal } from "@/lib/rbac";
import { businessDateKey, formatBusinessDateTime } from "@/lib/workforce-time";

export default async function DispatchDashboardPage() {
  const ctx = await requirePortal("dispatch");
  const [deliveries, drivers, customers, contractRoutes] = await Promise.all([
    prisma.delivery.findMany({
      include: {
        customer: true,
        driver: true,
        contract: true,
        routeTemplate: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.employee.findMany({
      where: { isDriver: true, status: "ACTIVE" },
      orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
    }),
    prisma.customer.findMany({ orderBy: { legalName: "asc" } }),
    prisma.routeTemplate.findMany({
      where: {
        scope: "CONTRACT",
        active: true,
        contract: { status: { in: ["ACTIVE", "EXPIRING", "RENEWED"] } },
      },
      include: {
        contract: { include: { customer: true } },
        primaryDriver: true,
        backupDriver: true,
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);
  const canCreate = hasPermission(ctx, "delivery.create");
  const todayEastern = businessDateKey(new Date());

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Dispatch board</h1>
      <p className="mt-2 text-sm text-muted">
        Use a contract route for routine work or create an ad-hoc assignment. All operational times display in Eastern Time.
      </p>

      {canCreate && contractRoutes.length ? (
        <section className="mt-6 rounded-2xl border border-line bg-paper p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Ready contract routes</p>
          <h2 className="mt-1 text-xl font-semibold text-navy">Create from contract setup</h2>
          <p className="mt-1 text-sm text-muted">
            The route rules and paperwork are already loaded. Edit only what changed for this run.
          </p>

          <div className="mt-5 grid gap-5">
            {contractRoutes.map((route) => (
              <form
                key={route.id}
                action={createDeliveryFromRouteTemplate.bind(null, route.id)}
                className="grid gap-3 rounded-2xl border border-line bg-ice p-4 lg:grid-cols-2"
              >
                <div className="lg:col-span-2">
                  <p className="font-mono text-xs text-muted">
                    {route.contract?.contractNumber} · {route.templateCode}
                  </p>
                  <h3 className="mt-1 font-semibold text-navy">{route.name}</h3>
                  <p className="text-sm text-muted">
                    {route.contract?.customer.legalName} · {route.operatingDays ?? "Schedule not set"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Primary: {route.primaryDriver ? route.primaryDriver.legalFirstName + " " + route.primaryDriver.legalLastName : "Auto"}
                    {" · "}
                    Backup: {route.backupDriver ? route.backupDriver.legalFirstName + " " + route.backupDriver.legalLastName : "None"}
                  </p>
                </div>

                <label className="text-sm font-semibold text-navy">
                  Service date
                  <input name="serviceDate" type="date" defaultValue={todayEastern} required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-navy">
                  Courier
                  <select name="driverEmployeeId" defaultValue="AUTO" className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm">
                    <option value="AUTO">Auto assign — primary → backup → eligible courier</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.legalFirstName} {driver.legalLastName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-navy">
                  Pickup business
                  <input name="pickupBusinessName" defaultValue={route.pickupBusinessName ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-navy">
                  Delivery business
                  <input name="deliveryBusinessName" defaultValue={route.deliveryBusinessName ?? ""} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
                </label>

                <label className="text-sm font-semibold text-navy">
                  Pickup address
                  <input name="pickupAddress" defaultValue={route.pickupAddress ?? ""} required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-navy">
                  Delivery address
                  <input name="deliveryAddress" defaultValue={route.deliveryAddress ?? ""} required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
                </label>

                <label className="text-sm font-semibold text-navy">
                  Pickup time (Eastern)
                  <input name="pickupTimeLocal" type="time" defaultValue={route.pickupTimeLocal ?? ""} required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-navy">
                  Deliver by (Eastern)
                  <input name="deliverByTimeLocal" type="time" defaultValue={route.deliverByTimeLocal ?? ""} required className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm" />
                </label>

                <div className="rounded-xl border border-line bg-paper p-3 text-xs text-muted lg:col-span-2">
                  <span className="font-semibold text-navy">Loaded automatically:</span>{" "}
                  {route.shipmentType ?? "Medical route"}
                  {route.temperatureRequired ? " · Temp: " + route.temperatureRequired : ""}
                  {route.chainOfCustodyRequired ? " · Chain of custody" : ""}
                  {route.proofOfDeliveryRequired ? " · Recipient/POD sign-off" : ""}
                  {route.vehicleRequirement ? " · Vehicle: " + route.vehicleRequirement : ""}
                  {route.requiredTrainingKeys ? " · Training: " + route.requiredTrainingKeys : ""}
                </div>

                <button className="w-fit rounded-full bg-medical px-4 py-2 text-sm font-semibold text-white lg:col-span-2">
                  Create contract assignment
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      {canCreate ? (
        <details className="mt-6 rounded-2xl border border-line bg-paper p-5">
          <summary className="cursor-pointer font-semibold text-navy">Create ad-hoc assignment</summary>
          <form action={createDelivery} className="mt-4 grid gap-3 sm:grid-cols-2">
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
            <input name="pickupBusinessName" placeholder="Pickup business name" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="deliveryBusinessName" placeholder="Delivery business name" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="pickupAddress" required placeholder="Pickup address" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="deliveryAddress" required placeholder="Delivery address" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <label className="text-sm">Pickup (Eastern Time) <input name="pickupAt" type="datetime-local" className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
            <label className="text-sm">Deliver by (Eastern Time) <input name="deliverBy" type="datetime-local" className="mt-1 w-full rounded-lg border border-line px-3 py-2" /></label>
            <input name="shipmentType" placeholder="Shipment type" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="temperatureRequired" placeholder="Temperature requirements" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="customerInstructions" placeholder="Customer instructions" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
            <input name="handlingInstructions" placeholder="Handling / chain-of-custody notes" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input name="chainOfCustodyRequired" type="checkbox" /> Chain of custody required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input name="proofOfDeliveryRequired" type="checkbox" defaultChecked /> Recipient / proof-of-delivery sign-off required
              </label>
            </div>
            <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:w-fit">Create ad-hoc assignment</button>
          </form>
        </details>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Assignment</th>
              <th className="px-4 py-3">Contract / customer</th>
              <th className="px-4 py-3">Courier</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Due</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-muted">No deliveries yet.</td></tr>
            ) : (
              deliveries.map((delivery) => (
                <tr key={delivery.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={"/dispatch/deliveries/" + delivery.id} className="font-semibold text-navy hover:text-medical">
                      {delivery.deliveryNumber}
                    </Link>
                    <p className="text-xs text-muted">{delivery.status.replaceAll("_", " ")}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{delivery.contract?.contractNumber ?? "Ad-hoc"}</p>
                    <p className="text-xs text-muted">{delivery.customer.legalName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>
                      {delivery.driver ? delivery.driver.legalFirstName + " " + delivery.driver.legalLastName : <span className="font-semibold text-amber-700">UNASSIGNED</span>}
                    </p>
                    {canCreate && ["DRAFT", "ASSIGNED"].includes(delivery.status) ? (
                      <form action={assignDeliveryCourier.bind(null, delivery.id)} className="mt-2 grid gap-1">
                        <select
                          name="driverEmployeeId"
                          defaultValue={delivery.driverEmployeeId ?? (delivery.routeTemplateId ? "AUTO" : "")}
                          className="rounded-lg border border-line px-2 py-1.5 text-xs"
                        >
                          {delivery.routeTemplateId ? <option value="AUTO">Auto assign</option> : <option value="">Choose courier</option>}
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.legalFirstName} {driver.legalLastName}
                            </option>
                          ))}
                        </select>
                        <button className="w-fit rounded-full border border-navy px-2.5 py-1 text-xs font-semibold text-navy">
                          {delivery.driver ? "Reassign" : "Assign"}
                        </button>
                      </form>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p>{delivery.pickupBusinessName ?? delivery.pickupAddress}</p>
                    <p className="text-xs text-muted">→ {delivery.deliveryBusinessName ?? delivery.deliveryAddress}</p>
                    {delivery.routeTemplate ? <p className="text-xs text-muted">{delivery.routeTemplate.name}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatBusinessDateTime(delivery.deliverBy)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
