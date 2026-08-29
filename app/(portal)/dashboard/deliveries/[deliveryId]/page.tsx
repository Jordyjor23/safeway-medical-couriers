import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeliveryProfile } from "@/components/portal/DeliveryProfile";
import { documentUploadCapabilities } from "@/app/(portal)/dashboard/documents/actions";
import { canAssociateDelivery } from "@/lib/documents/access";
import { DOCUMENT_LIST_INCLUDE, documentLibraryWhere } from "@/lib/documents/query";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Delivery" };

export default async function StaffDeliveryPage({
  params,
}: {
  params: Promise<{ deliveryId: string }>;
}) {
  const ctx = await requirePermission("delivery.view");
  const { deliveryId } = await params;
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { customer: true, driver: true },
  });
  if (!delivery) notFound();
  const canViewDocs = hasPermission(ctx, "documents.view");
  const [documents, capabilities] = canViewDocs
    ? await Promise.all([
        prisma.managedDocument.findMany({
          where: documentLibraryWhere(ctx, { deliveryId, archived: "all" }),
          include: DOCUMENT_LIST_INCLUDE,
          orderBy: { createdAt: "desc" },
        }),
        documentUploadCapabilities(),
      ])
    : [[], { canUpload: false, associations: { employee: false, customer: false, contract: false, delivery: false } } as Awaited<ReturnType<typeof documentUploadCapabilities>>];

  return (
    <DeliveryProfile
      backHref="/dashboard"
      backLabel="Dashboard"
      delivery={delivery}
      documents={canViewDocs ? documents : []}
      canUpload={capabilities.canUpload && canAssociateDelivery(ctx, delivery)}
      canDownload={hasPermission(ctx, "documents.download")}
      canOpenDetails
      associations={capabilities.associations}
    />
  );
}
