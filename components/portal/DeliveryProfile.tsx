import Link from "next/link";
import { DocumentUploader } from "@/components/portal/DocumentUploader";
import { EntityDocumentsSection } from "@/components/portal/EntityDocumentsSection";
import { DELIVERY_DOCUMENT_GROUPS } from "@/lib/documents/groups";
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
    customer: { id: string; legalName: string };
    driver: { id: string; legalFirstName: string; legalLastName: string } | null;
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
        <p className="mt-2 text-sm">
          {delivery.pickupAddress} → {delivery.deliveryAddress}
        </p>
      </div>
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
