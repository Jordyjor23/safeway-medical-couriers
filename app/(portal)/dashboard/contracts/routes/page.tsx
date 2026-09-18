import type { Metadata } from "next";
import {
  archiveRouteTemplate,
  createGenericRouteTemplate,
  updateRouteTemplate,
} from "@/app/(portal)/dashboard/contracts/routes/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Route templates" };

const field = "rounded-lg border border-line px-3 py-2 text-sm";
const label = "grid gap-1 text-xs font-semibold text-navy";

export default async function RouteTemplatesPage() {
  const ctx = await requirePermission("contracts.view");
  const canEdit = hasPermission(ctx, "contracts.edit");
  const templates = await prisma.routeTemplate.findMany({
    where: { scope: "GENERIC" },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Reusable operations library</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">Route templates</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Keep generic route setups here. Copy a template into a customer contract, then edit the business-specific names, addresses, schedule, staffing, and requirements without changing the master copy.
        </p>
      </div>

      {canEdit ? (
        <form action={createGenericRouteTemplate} className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-2">
          <h2 className="font-semibold text-navy md:col-span-2">Create generic template</h2>
          <label className={label}>Template name<input name="name" required placeholder="Standard lab route" className={field} /></label>
          <label className={label}>Operating days<input name="operatingDays" placeholder="Mon-Fri / On demand" className={field} /></label>
          <label className={label}>Pickup business name<input name="pickupBusinessName" placeholder="Pickup Facility" className={field} /></label>
          <label className={label}>Delivery business name<input name="deliveryBusinessName" placeholder="Receiving Facility" className={field} /></label>
          <label className={label}>Pickup address<input name="pickupAddress" placeholder="Generic or default address" className={field} /></label>
          <label className={label}>Delivery address<input name="deliveryAddress" placeholder="Generic or default address" className={field} /></label>
          <label className={label}>Default pickup time<input name="pickupTimeLocal" type="time" className={field} /></label>
          <label className={label}>Default deliver-by time<input name="deliverByTimeLocal" type="time" className={field} /></label>
          <label className={label}>Shipment type<input name="shipmentType" placeholder="Specimens / pharma / supplies" className={field} /></label>
          <label className={label}>Temperature requirement<input name="temperatureRequired" placeholder="Configure per shipment" className={field} /></label>
          <label className={label}>Required training keys<input name="requiredTrainingKeys" placeholder="HIPAA,BLOODBORNE_PATHOGENS" className={field} /></label>
          <label className={label}>Required certifications<input name="requiredCertificationNames" placeholder="Certification names, comma separated" className={field} /></label>
          <label className={label}>Vehicle requirement<input name="vehicleRequirement" placeholder="SUV / cargo van / any" className={field} /></label>
          <label className={label}>Estimated route hours<input name="estimatedRouteHours" type="number" min="0" step="0.25" className={field} /></label>
          <label className={label}>Route pay<input name="routePay" type="number" min="0" step="0.01" className={field} /></label>
          <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
            <label className="flex items-center gap-2"><input name="chainOfCustodyRequired" type="checkbox" /> Chain of custody</label>
            <label className="flex items-center gap-2"><input name="proofOfDeliveryRequired" type="checkbox" defaultChecked /> Recipient / POD sign-off</label>
          </div>
          <label className={label + " md:col-span-2"}>Customer instructions<textarea name="customerInstructions" rows={2} className={field} /></label>
          <label className={label + " md:col-span-2"}>Handling instructions<textarea name="handlingInstructions" rows={3} className={field} /></label>
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white md:col-span-2">Create template</button>
        </form>
      ) : null}

      <div className="mt-8 grid gap-5">
        {templates.map((template) => (
          <section key={template.id} className="rounded-2xl border border-line bg-paper p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-muted">{template.templateCode}</p>
                <h2 className="mt-1 text-lg font-semibold text-navy">{template.name}</h2>
                <p className="text-xs text-muted">{template.active ? "Active master template" : "Archived master template"}</p>
              </div>
              {canEdit && template.active ? (
                <form action={archiveRouteTemplate.bind(null, template.id)}>
                  <button className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-navy">Archive</button>
                </form>
              ) : null}
            </div>

            {canEdit ? (
              <form action={updateRouteTemplate.bind(null, template.id)} className="mt-4 grid gap-3 md:grid-cols-2">
                {template.active ? <input type="hidden" name="active" value="on" /> : null}
                <label className={label}>Template name<input name="name" defaultValue={template.name} className={field} /></label>
                <label className={label}>Operating days<input name="operatingDays" defaultValue={template.operatingDays ?? ""} className={field} /></label>
                <label className={label}>Pickup business<input name="pickupBusinessName" defaultValue={template.pickupBusinessName ?? ""} className={field} /></label>
                <label className={label}>Delivery business<input name="deliveryBusinessName" defaultValue={template.deliveryBusinessName ?? ""} className={field} /></label>
                <label className={label}>Pickup address<input name="pickupAddress" defaultValue={template.pickupAddress ?? ""} className={field} /></label>
                <label className={label}>Delivery address<input name="deliveryAddress" defaultValue={template.deliveryAddress ?? ""} className={field} /></label>
                <label className={label}>Pickup time<input name="pickupTimeLocal" type="time" defaultValue={template.pickupTimeLocal ?? ""} className={field} /></label>
                <label className={label}>Deliver-by time<input name="deliverByTimeLocal" type="time" defaultValue={template.deliverByTimeLocal ?? ""} className={field} /></label>
                <label className={label}>Shipment type<input name="shipmentType" defaultValue={template.shipmentType ?? ""} className={field} /></label>
                <label className={label}>Temperature<input name="temperatureRequired" defaultValue={template.temperatureRequired ?? ""} className={field} /></label>
                <label className={label}>Training keys<input name="requiredTrainingKeys" defaultValue={template.requiredTrainingKeys ?? ""} className={field} /></label>
                <label className={label}>Certifications<input name="requiredCertificationNames" defaultValue={template.requiredCertificationNames ?? ""} className={field} /></label>
                <label className={label}>Vehicle requirement<input name="vehicleRequirement" defaultValue={template.vehicleRequirement ?? ""} className={field} /></label>
                <label className={label}>Estimated hours<input name="estimatedRouteHours" type="number" min="0" step="0.25" defaultValue={template.estimatedRouteHours?.toString() ?? ""} className={field} /></label>
                <label className={label}>Route pay<input name="routePay" type="number" min="0" step="0.01" defaultValue={template.routePay?.toString() ?? ""} className={field} /></label>
                <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
                  <label className="flex items-center gap-2"><input name="chainOfCustodyRequired" type="checkbox" defaultChecked={template.chainOfCustodyRequired} /> Chain of custody</label>
                  <label className="flex items-center gap-2"><input name="proofOfDeliveryRequired" type="checkbox" defaultChecked={template.proofOfDeliveryRequired} /> Recipient / POD sign-off</label>
                </div>
                <label className={label + " md:col-span-2"}>Customer instructions<textarea name="customerInstructions" rows={2} defaultValue={template.customerInstructions ?? ""} className={field} /></label>
                <label className={label + " md:col-span-2"}>Handling instructions<textarea name="handlingInstructions" rows={3} defaultValue={template.handlingInstructions ?? ""} className={field} /></label>
                <button className="w-fit rounded-full bg-medical px-4 py-2 text-sm font-semibold text-white md:col-span-2">Save template</button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-muted">{template.shipmentType ?? "No shipment type configured."}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
