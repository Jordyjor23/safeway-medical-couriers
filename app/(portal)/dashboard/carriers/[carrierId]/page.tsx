import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  assignCarrierPartnerToContract,
  deleteCarrierPartner,
  removeCarrierPartnerFromContract,
  updateCarrierPartner,
} from "@/app/(portal)/dashboard/carriers/actions";
import { ConfirmSubmitButton } from "@/components/portal/ConfirmSubmitButton";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";
import { formatBusinessDate } from "@/lib/workforce-time";

export const metadata: Metadata = { title: "Carrier partner" };

const fieldClass = "mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm";
const statuses = ["PROSPECT", "ONBOARDING", "QUALIFIED", "ACTIVE", "SUSPENDED", "INACTIVE"];
const partnerTypes = ["COURIER_FLEET", "FREIGHT_CARRIER", "OWNER_OPERATOR", "LOGISTICS_PROVIDER", "SUBCONTRACTOR"];
const agreementStatuses = ["NOT_STARTED", "REQUESTED", "UNDER_REVIEW", "EXECUTED", "EXPIRED", "TERMINATED"];
const assignmentStatuses = ["PROPOSED", "APPROVED", "ACTIVE", "PAUSED", "ENDED"];

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function CarrierPartnerDetailPage({
  params,
}: {
  params: Promise<{ carrierId: string }>;
}) {
  const ctx = await requirePermission("carrierPartners.view");
  const { carrierId } = await params;

  const [partner, contracts] = await Promise.all([
    prisma.carrierPartner.findUnique({
      where: { id: carrierId },
      include: {
        contractAssignments: {
          include: { contract: { include: { customer: true } } },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.contract.findMany({
      include: { customer: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!partner) notFound();

  const canEdit = hasPermission(ctx, "carrierPartners.edit");
  const canManage = hasPermission(ctx, "carrierPartners.manage");
  const canEditContracts = hasPermission(ctx, "contracts.edit");

  const coreReady =
    partner.w9Received &&
    partner.coiReceived &&
    partner.autoInsuranceVerified &&
    partner.agreementStatus === "EXECUTED" &&
    ["QUALIFIED", "ACTIVE"].includes(partner.status);

  const medicalReady =
    coreReady &&
    partner.hipaaVerified &&
    partner.bloodbornePathogensVerified &&
    partner.backgroundProcessVerified;

  const expirationDates = [
    partner.insuranceExpiration,
    partner.cargoInsuranceExpiration,
    partner.agreementExpiration,
  ].filter((value): value is Date => Boolean(value));
  const nearestExpiration = expirationDates.sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/carriers" className="text-sm font-semibold text-medical hover:underline">
          ← Carrier partners
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-navy">{partner.legalName}</h1>
            <p className="mt-1 text-sm text-muted">
              {partner.partnerNumber} · {partner.partnerType.replaceAll("_", " ")} · {partner.status.replaceAll("_", " ")}
            </p>
          </div>
          <div className="flex gap-2 text-xs font-semibold">
            <span className={`rounded-full px-3 py-1 ${coreReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
              General: {coreReady ? "Ready" : "Needs review"}
            </span>
            <span className={`rounded-full px-3 py-1 ${medicalReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
              Medical: {medicalReady ? "Ready" : "Needs review"}
            </span>
          </div>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Contract assignments</p>
          <p className="mt-1 text-2xl font-semibold text-navy">{partner.contractAssignments.length}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">MC / USDOT</p>
          <p className="mt-1 text-sm font-semibold text-navy">{partner.mcNumber ? `MC ${partner.mcNumber}` : "MC —"}</p>
          <p className="text-sm text-muted">{partner.dotNumber ? `USDOT ${partner.dotNumber}` : "USDOT —"}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Nearest tracked expiration</p>
          <p className="mt-1 text-sm font-semibold text-navy">{nearestExpiration ? formatBusinessDate(nearestExpiration) : "No expiration entered"}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Partner profile & capacity</h2>
        {canEdit ? (
          <form action={updateCarrierPartner.bind(null, partner.id)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-navy">
              Legal name
              <input name="legalName" required defaultValue={partner.legalName} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              DBA
              <input name="dba" defaultValue={partner.dba ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Partner type
              <select name="partnerType" defaultValue={partner.partnerType} className={fieldClass}>
                {partnerTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Status
              <select name="status" defaultValue={partner.status} className={fieldClass}>
                {statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <input name="contactName" defaultValue={partner.contactName ?? ""} placeholder="Primary contact" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="contactEmail" type="email" defaultValue={partner.contactEmail ?? ""} placeholder="Contact email" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="contactPhone" defaultValue={partner.contactPhone ?? ""} placeholder="Contact phone" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="website" defaultValue={partner.website ?? ""} placeholder="Website" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="mcNumber" defaultValue={partner.mcNumber ?? ""} placeholder="MC number" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="dotNumber" defaultValue={partner.dotNumber ?? ""} placeholder="USDOT number" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="headquartersCity" defaultValue={partner.headquartersCity ?? ""} placeholder="HQ city" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="headquartersState" defaultValue={partner.headquartersState ?? ""} placeholder="HQ state" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Service regions
              <textarea name="serviceRegions" rows={2} defaultValue={partner.serviceRegions ?? ""} className={fieldClass} placeholder="Midwest, Washington, Ohio statewide, etc." />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Operating states
              <input name="operatingStates" defaultValue={partner.operatingStates ?? ""} className={fieldClass} placeholder="OH, MI, IN, WA" />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Equipment
              <textarea name="equipment" rows={2} defaultValue={partner.equipment ?? ""} className={fieldClass} placeholder="Sprinter vans, SUVs, 26' box truck, liftgate, pallet jack..." />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              General capabilities
              <textarea name="capabilities" rows={2} defaultValue={partner.capabilities ?? ""} className={fieldClass} placeholder="Same-day, dedicated routes, recurring lanes, expedited, overflow..." />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Medical capabilities
              <textarea name="medicalCapabilities" rows={2} defaultValue={partner.medicalCapabilities ?? ""} className={fieldClass} placeholder="Specimens, pharmacy, supplies, temperature control, chain of custody..." />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Availability
              <textarea name="availabilityNotes" rows={2} defaultValue={partner.availabilityNotes ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Rates / commercial notes
              <textarea name="rateNotes" rows={2} defaultValue={partner.rateNotes ?? ""} className={fieldClass} />
            </label>

            <div className="sm:col-span-2">
              <h3 className="mt-2 font-semibold text-navy">Onboarding & compliance checklist</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["w9Received", "W-9 received", partner.w9Received],
                  ["coiReceived", "COI received", partner.coiReceived],
                  ["autoInsuranceVerified", "Auto insurance verified", partner.autoInsuranceVerified],
                  ["cargoInsuranceVerified", "Cargo insurance verified", partner.cargoInsuranceVerified],
                  ["rateSheetReceived", "Rate sheet received", partner.rateSheetReceived],
                  ["backgroundProcessVerified", "Background/MVR process verified", partner.backgroundProcessVerified],
                  ["hipaaVerified", "HIPAA verified", partner.hipaaVerified],
                  ["bloodbornePathogensVerified", "Bloodborne Pathogens verified", partner.bloodbornePathogensVerified],
                  ["hazmatVerified", "HazMat / regulated-material capability verified", partner.hazmatVerified],
                ].map(([name, label, value]) => (
                  <label key={String(name)} className="flex items-center gap-2 rounded-xl border border-line p-3 text-sm">
                    <input name={String(name)} type="checkbox" defaultChecked={Boolean(value)} />
                    {String(label)}
                  </label>
                ))}
              </div>
            </div>

            <label className="text-sm font-semibold text-navy">
              Auto / primary insurance expiration
              <input name="insuranceExpiration" type="date" defaultValue={isoDate(partner.insuranceExpiration)} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Cargo insurance expiration
              <input name="cargoInsuranceExpiration" type="date" defaultValue={isoDate(partner.cargoInsuranceExpiration)} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Carrier agreement status
              <select name="agreementStatus" defaultValue={partner.agreementStatus} className={fieldClass}>
                {agreementStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Carrier agreement expiration
              <input name="agreementExpiration" type="date" defaultValue={isoDate(partner.agreementExpiration)} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Internal notes
              <textarea name="notes" rows={3} defaultValue={partner.notes ?? ""} className={fieldClass} />
            </label>
            <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:col-span-2">
              Save carrier partner
            </button>
          </form>
        ) : (
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p>Contact: {partner.contactName ?? "—"}</p>
            <p>Email: {partner.contactEmail ?? "—"}</p>
            <p>Phone: {partner.contactPhone ?? "—"}</p>
            <p>Coverage: {partner.serviceRegions ?? "—"}</p>
            <p className="sm:col-span-2">Equipment: {partner.equipment ?? "—"}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <div>
          <h2 className="font-semibold text-navy">Contract assignments</h2>
          <p className="mt-1 text-xs text-muted">
            Use the carrier as subcontracted regional capacity only where the customer contract and applicable authority allow it.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {partner.contractAssignments.length === 0 ? (
            <p className="text-sm text-muted">No contracts assigned yet.</p>
          ) : partner.contractAssignments.map((assignment) => (
            <div key={assignment.id} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/dashboard/contracts/${assignment.contractId}`} className="font-semibold text-navy hover:text-medical">
                    {assignment.contract.contractNumber} · {assignment.contract.customer.legalName}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {assignment.status.replaceAll("_", " ")}
                    {assignment.role ? ` · ${assignment.role}` : ""}
                    {assignment.serviceScope ? ` · ${assignment.serviceScope}` : ""}
                  </p>
                  {assignment.rateTerms ? <p className="mt-2 text-xs text-muted">Rates: {assignment.rateTerms}</p> : null}
                </div>
                {canEditContracts ? (
                  <form action={removeCarrierPartnerFromContract.bind(null, partner.id, assignment.id)}>
                    <ConfirmSubmitButton
                      label="End assignment"
                      confirmText="End this carrier assignment? The history will be retained."
                      className="text-xs font-semibold text-red-700"
                    />
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {canEditContracts ? (
          <form action={assignCarrierPartnerToContract.bind(null, partner.id)} className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
            <select name="contractId" required className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2">
              <option value="">Select contract / opportunity</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contractNumber} · {contract.customer.legalName} · {contract.status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select name="assignmentStatus" className="rounded-lg border border-line px-3 py-2 text-sm">
              {assignmentStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
            <input name="role" placeholder="Role (regional subcontractor, backup carrier...)" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="serviceScope" placeholder="Scope / lane / territory" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="rateTerms" placeholder="Rate terms / markup / route rate" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="priority" type="number" min="1" placeholder="Priority" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="assignmentNotes" placeholder="Assignment notes" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:col-span-2">
              Assign to contract
            </button>
          </form>
        ) : null}
      </section>

      {canManage && partner.contractAssignments.length === 0 && partner.status !== "ACTIVE" ? (
        <form action={deleteCarrierPartner.bind(null, partner.id)}>
          <ConfirmSubmitButton
            label="Delete empty carrier record"
            confirmText="Permanently delete this carrier partner record? This cannot be undone."
          />
        </form>
      ) : null}
    </div>
  );
}
