import Link from "next/link";
import { DocumentUploader } from "@/components/portal/DocumentUploader";
import { EntityDocumentsSection } from "@/components/portal/EntityDocumentsSection";
import { DELIVERY_DOCUMENT_GROUPS } from "@/lib/documents/groups";
import { formatBusinessDateTime } from "@/lib/workforce-time";
import type { DocumentCategory } from "@prisma/client";

type ListedDocument = Parameters<typeof EntityDocumentsSection>[0]["documents"][number];

export function DeliveryProfile({
  backHref,
  backLabel,
  delivery,
  documents,
  canUpload,
  canDownload,
  canOpenDetails,
  associations,
}: {
  backHref: string;
  backLabel: string;
  delivery: {
    id: string;
    deliveryNumber: string;
    status: string;
    pickupAddress: string;
    deliveryAddress: string;
    pickupBusinessName: string | null;
    deliveryBusinessName: string | null;
    customer: { id: string; legalName: string };
    contract: { contractNumber: string } | null;
    routeTemplate: { name: string; templateCode: string } | null;
    driver: { id: string; legalFirstName: string; legalLastName: string } | null;
    checklistItems: Array<{ id: string; label: string; required: boolean; status: string; completedAt: Date | null; note: string | null }>;
    signoffs: Array<{ id: string; role: string; signerName: string; signerTitle: string | null; signedAt: Date; attested: boolean }>;
  };
  documents: ListedDocument[];
  canUpload: boolean;
  canDownload: boolean;
  canOpenDetails: boolean;
  associations: { employee: boolean; customer: boolean; contract: boolean; delivery: boolean };
}) {
  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-medical hover:underline">
          ← {backLabel}
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-medical">{delivery.deliveryNumber}</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">{delivery.status.replaceAll("_", " ")}</h1>
        <p className="text-muted">
          {delivery.customer.legalName}
          {delivery.driver ? ` · ${delivery.driver.legalFirstName} ${delivery.driver.legalLastName}` : ""}
        </p>
        {delivery.contract || delivery.routeTemplate ? (
          <p className="mt-1 text-xs text-muted">
            {delivery.contract?.contractNumber ?? "Contract route"}
            {delivery.routeTemplate ? ` · ${delivery.routeTemplate.name} (${delivery.routeTemplate.templateCode})` : ""}
          </p>
        ) : null}
        <p className="mt-2 text-sm">
          {delivery.pickupBusinessName ? `${delivery.pickupBusinessName} · ` : ""}{delivery.pickupAddress}
          {" → "}
          {delivery.deliveryBusinessName ? `${delivery.deliveryBusinessName} · ` : ""}{delivery.deliveryAddress}
        </p>
      </div>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold text-navy">Route assignment packet</h2><p className="mt-1 text-sm text-muted">Courier task completion and electronic sign-offs for this delivery.</p></div>
          <span className="text-xs font-semibold text-muted">{delivery.checklistItems.filter((item) => item.status === "COMPLETED").length}/{delivery.checklistItems.length} tasks complete</span>
        </div>
        {delivery.checklistItems.length ? (
          <ul className="mt-4 grid gap-2">
            {delivery.checklistItems.map((item) => (
              <li key={item.id} className="rounded-xl border border-line p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><span className="font-medium text-navy">{item.label}</span><span className="text-xs font-semibold text-muted">{item.status}</span></div>
                {item.completedAt ? <p className="mt-1 text-xs text-muted">Completed {formatBusinessDateTime(item.completedAt)}</p> : null}
                {item.note ? <p className="mt-1 text-xs text-muted">{item.note}</p> : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted">Route packet has not been initialized yet.</p>}
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-navy">Sign-offs</h3>
          {delivery.signoffs.length ? <ul className="mt-2 space-y-1 text-sm">{delivery.signoffs.map((signoff) => <li key={signoff.id}>{signoff.role} · {signoff.signerName}{signoff.signerTitle ? ` (${signoff.signerTitle})` : ""} · {formatBusinessDateTime(signoff.signedAt)}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No sign-offs recorded.</p>}
        </div>
      </section>

      <EntityDocumentsSection
        title="Delivery documents"
        documents={documents}
        groups={DELIVERY_DOCUMENT_GROUPS}
        canDownload={canDownload}
        canUpload={canUpload}
        canOpenDetails={canOpenDetails}
        emptyBody="No authorized delivery files yet."
      >
        <DocumentUploader
          associations={associations}
          preset={{
            deliveryId: delivery.id,
            deliveryLabel: `${delivery.deliveryNumber} · ${delivery.customer.legalName}`,
            customerId: delivery.customer.id,
            customerLabel: delivery.customer.legalName,
            category: "COMPLIANCE" as DocumentCategory,
          }}
        />
      </EntityDocumentsSection>
    </div>
  );
}
