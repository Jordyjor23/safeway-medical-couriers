import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteContract, updateContract } from "@/app/(portal)/dashboard/contracts/actions";
import {
  archiveRouteTemplate,
  copyRouteTemplateToContract,
  updateRouteTemplate,
} from "@/app/(portal)/dashboard/contracts/routes/actions";
import { documentUploadCapabilities } from "@/app/(portal)/dashboard/documents/actions";
import { ConfirmSubmitButton } from "@/components/portal/ConfirmSubmitButton";
import { DocumentUploader } from "@/components/portal/DocumentUploader";
import { EntityDocumentsSection } from "@/components/portal/EntityDocumentsSection";
import { canAssociateContract } from "@/lib/documents/access";
import { CONTRACT_DOCUMENT_GROUPS } from "@/lib/documents/groups";
import { DOCUMENT_LIST_INCLUDE, documentLibraryWhere } from "@/lib/documents/query";
import { prisma } from "@/lib/db";
import { formatBusinessDate } from "@/lib/workforce-time";
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
  const [contract, customers, genericTemplates, drivers] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
        routeTemplates: {
          include: {
            primaryDriver: true,
            backupDriver: true,
            _count: { select: { deliveries: true } },
          },
          orderBy: [{ active: "desc" }, { name: "asc" }],
        },
        _count: { select: { documents: true, amendments: true } },
      },
    }),
    prisma.customer.findMany({ orderBy: { legalName: "asc" } }),
    prisma.routeTemplate.findMany({
      where: { scope: "GENERIC", active: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { isDriver: true, status: { in: ["ACTIVE", "PENDING_ONBOARDING"] } },
      orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
    }),
  ]);
  if (!contract) notFound();
  const canEdit = hasPermission(ctx, "contracts.edit");
  const canDelete =
    hasPermission(ctx, "contracts.delete") &&
    contract.status === "DRAFT" &&
    contract._count.documents === 0 &&
    contract._count.amendments === 0;
  const canViewDocs = hasPermission(ctx, "documents.view");
  const [documents, capabilities] = canViewDocs
    ? await Promise.all([
        prisma.managedDocument.findMany({
          where: documentLibraryWhere(ctx, { contractId, archived: "all" }),
          include: DOCUMENT_LIST_INCLUDE,
          orderBy: { createdAt: "desc" },
        }),
        documentUploadCapabilities(),
      ])
    : [[], null];
  const save = updateContract.bind(null, contract.id);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard/contracts" className="text-sm font-semibold text-medical hover:underline">
            ← Contracts
          </Link>
          {hasPermission(ctx, "finance.view") ? (
            <Link
              href={`/dashboard/contracts/operating-model?new=1&contract=${contract.id}`}
              className="rounded-full border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-navy hover:text-white"
            >
              Model this contract
            </Link>
          ) : null}
        </div>
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
            <p>Expires: {contract.expirationDate ? formatBusinessDate(contract.expirationDate) : "—"}</p>
            <p>{contract.notes ?? "No notes."}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-navy">Contract route operations</h2>
            <p className="mt-1 text-sm text-muted">
              Copy a reusable route setup into this contract, then customize the customer-specific locations, staffing, times, and requirements.
            </p>
          </div>
          <Link href="/dashboard/contracts/routes" className="text-sm font-semibold text-medical hover:underline">
            Open template library
          </Link>
        </div>

        {contract.routeTemplates.length ? (
          <div className="mt-5 grid gap-5">
            {contract.routeTemplates.map((route) => (
              <div key={route.id} className="rounded-2xl border border-line bg-ice p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted">{route.templateCode}</p>
                    <h3 className="mt-1 font-semibold text-navy">{route.name}</h3>
                    <p className="text-xs text-muted">
                      {route.active ? "Active" : "Archived"} · {route._count.deliveries} assignment{route._count.deliveries === 1 ? "" : "s"} created
                    </p>
                  </div>
                  {canEdit && route.active ? (
                    <form action={archiveRouteTemplate.bind(null, route.id)}>
                      <button className="rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold text-navy">Archive route</button>
                    </form>
                  ) : null}
                </div>

                {canEdit ? (
                  <form action={updateRouteTemplate.bind(null, route.id)} className="mt-4 grid gap-3 sm:grid-cols-2">
                    {route.active ? <input type="hidden" name="active" value="on" /> : null}
                    <label className="text-sm font-semibold text-navy">Route name<input name="name" defaultValue={route.name} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Operating days<input name="operatingDays" defaultValue={route.operatingDays ?? ""} placeholder="Mon-Fri" className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Pickup business<input name="pickupBusinessName" defaultValue={route.pickupBusinessName ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Delivery business<input name="deliveryBusinessName" defaultValue={route.deliveryBusinessName ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Pickup address<input name="pickupAddress" defaultValue={route.pickupAddress ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Delivery address<input name="deliveryAddress" defaultValue={route.deliveryAddress ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Default pickup time<input name="pickupTimeLocal" type="time" defaultValue={route.pickupTimeLocal ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Default deliver-by time<input name="deliverByTimeLocal" type="time" defaultValue={route.deliverByTimeLocal ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Primary courier
                      <select name="primaryDriverEmployeeId" defaultValue={route.primaryDriverEmployeeId ?? ""} className={fieldClass}>
                        <option value="">Auto-select eligible courier</option>
                        {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.legalFirstName} {driver.legalLastName}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-navy">Backup courier
                      <select name="backupDriverEmployeeId" defaultValue={route.backupDriverEmployeeId ?? ""} className={fieldClass}>
                        <option value="">No designated backup</option>
                        {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.legalFirstName} {driver.legalLastName}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-navy">Shipment type<input name="shipmentType" defaultValue={route.shipmentType ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Temperature requirement<input name="temperatureRequired" defaultValue={route.temperatureRequired ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Required training<input name="requiredTrainingKeys" defaultValue={route.requiredTrainingKeys ?? ""} placeholder="HIPAA,CHAIN_OF_CUSTODY" className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Required certifications<input name="requiredCertificationNames" defaultValue={route.requiredCertificationNames ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Vehicle requirement<input name="vehicleRequirement" defaultValue={route.vehicleRequirement ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Estimated route hours<input name="estimatedRouteHours" type="number" min="0" step="0.25" defaultValue={route.estimatedRouteHours?.toString() ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy">Route pay<input name="routePay" type="number" min="0" step="0.01" defaultValue={route.routePay?.toString() ?? ""} className={fieldClass} /></label>
                    <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
                      <label className="flex items-center gap-2"><input name="chainOfCustodyRequired" type="checkbox" defaultChecked={route.chainOfCustodyRequired} /> Chain of custody</label>
                      <label className="flex items-center gap-2"><input name="proofOfDeliveryRequired" type="checkbox" defaultChecked={route.proofOfDeliveryRequired} /> Recipient / POD sign-off</label>
                    </div>
                    <label className="text-sm font-semibold text-navy sm:col-span-2">Customer instructions<textarea name="customerInstructions" rows={2} defaultValue={route.customerInstructions ?? ""} className={fieldClass} /></label>
                    <label className="text-sm font-semibold text-navy sm:col-span-2">Handling instructions<textarea name="handlingInstructions" rows={3} defaultValue={route.handlingInstructions ?? ""} className={fieldClass} /></label>
                    <button className="w-fit rounded-full bg-medical px-4 py-2 text-sm font-semibold text-white sm:col-span-2">Save contract route</button>
                  </form>
                ) : (
                  <div className="mt-3 text-sm text-muted">
                    <p>{route.pickupBusinessName ?? "Pickup"} → {route.deliveryBusinessName ?? "Delivery"}</p>
                    <p>{route.operatingDays ?? "Schedule not configured"}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-sm text-muted">
            No contract routes yet. Copy one of the reusable templates below to get started.
          </p>
        )}

        {canEdit ? (
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="font-semibold text-navy">Copy a reusable setup into this contract</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {genericTemplates.map((template) => (
                <form key={template.id} action={copyRouteTemplateToContract.bind(null, template.id, contract.id)} className="rounded-xl border border-line p-4">
                  <p className="font-semibold text-navy">{template.name}</p>
                  <p className="mt-1 text-xs text-muted">{template.shipmentType ?? "General medical route"} · {template.operatingDays ?? "Configure schedule"}</p>
                  <button className="mt-3 rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white">Copy into {contract.customer.legalName}</button>
                </form>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {canDelete ? (
        <form action={deleteContract.bind(null, contract.id)}>
          <ConfirmSubmitButton
            label="Delete draft contract"
            confirmText="Permanently delete this draft contract? This cannot be undone."
          />
        </form>
      ) : null}

      {canViewDocs ? (
        <EntityDocumentsSection
          title="Documents"
          documents={documents}
          groups={CONTRACT_DOCUMENT_GROUPS}
          canDownload={hasPermission(ctx, "documents.download")}
          canUpload={Boolean(capabilities?.canUpload && canAssociateContract(ctx, contract.customerId))}
          emptyBody="No authorized contract files yet."
        >
          <DocumentUploader
            associations={capabilities?.associations ?? { employee: false, customer: false, contract: false, delivery: false }}
            preset={{
              contractId: contract.id,
              contractLabel: `${contract.contractNumber} · ${contract.customer.legalName}`,
              customerId: contract.customerId,
              customerLabel: contract.customer.legalName,
              category: "CUSTOMER_CONTRACTS",
            }}
          />
        </EntityDocumentsSection>
      ) : null}
    </div>
  );
}
