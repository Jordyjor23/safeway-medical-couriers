import {
  createIncident,
  initializeDeliveryPacket,
  setDeliveryChecklistItem,
  signDeliveryPacket,
  updateDeliveryStatus,
} from "@/app/(portal)/deliveries/actions";
import { EntityDocumentsSection } from "@/components/portal/EntityDocumentsSection";
import { documentFileHref } from "@/lib/documents/display";
import { employeeDocumentBuckets, missingRequirementLabels } from "@/lib/documents/buckets";
import { labelDocumentType } from "@/lib/documents/catalog";
import { DOCUMENT_LIST_INCLUDE, documentLibraryWhere } from "@/lib/documents/query";
import { prisma } from "@/lib/db";
import { driverProgressActions } from "@/lib/delivery-lifecycle";
import { courierSignoffRole } from "@/lib/route-packet";
import { hasPermission, requirePortal } from "@/lib/rbac";
import { formatBusinessDateTime } from "@/lib/workforce-time";

export default async function DriverDashboardPage() {
  const ctx = await requirePortal("driver");
  const deliveries = await prisma.delivery.findMany({
    where: { driver: { userId: ctx.user.id }, status: { notIn: ["CANCELLED"] } },
    include: {
      customer: true,
      contract: { select: { contractNumber: true } },
      routeTemplate: { select: { name: true, templateCode: true } },
      driver: { select: { legalFirstName: true, legalLastName: true, classification: true } },
      events: { orderBy: { createdAt: "desc" }, take: 5 },
      checklistItems: { orderBy: { sortOrder: "asc" } },
      signoffs: { orderBy: { signedAt: "asc" } },
    },
    orderBy: [{ deliverBy: "asc" }, { createdAt: "desc" }],
  });
  const deliveryDocuments = hasPermission(ctx, "documents.view")
    ? await prisma.managedDocument.findMany({
        where: documentLibraryWhere(ctx, { archived: "all" }),
        include: DOCUMENT_LIST_INCLUDE,
        orderBy: { createdAt: "desc" },
      })
    : [];
  const buckets = employeeDocumentBuckets(deliveryDocuments);
  const rules = hasPermission(ctx, "documents.view")
    ? await prisma.documentRequirementRule.findMany({ include: { requirement: true } })
    : [];
  const missing = missingRequirementLabels({ rules, records: [], documents: deliveryDocuments });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy sm:text-3xl">Today&apos;s assignments</h1>
      <p className="text-sm text-muted">
        Assigned route times display in Eastern Time. Complete the required route packet before closing an assignment.
      </p>

      {hasPermission(ctx, "documents.view") ? (
        <EntityDocumentsSection
          title="Your documents"
          documents={deliveryDocuments.filter((document) => document.employeeLinks.length > 0)}
          canDownload={hasPermission(ctx, "documents.download")}
          canOpenDetails={false}
          missing={missing}
          sections={[
            { label: "Expiring soon", documents: buckets.expiringSoon, empty: "None." },
            { label: "Expired", documents: buckets.expired, empty: "None." },
            { label: "Rejected", documents: buckets.rejected, empty: "None." },
            { label: "Needs action", documents: buckets.needsAction, empty: "Nothing needs action." },
          ]}
          emptyBody="No personal files assigned yet."
        />
      ) : null}

      {deliveries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper px-4 py-10 text-sm text-muted">
          No assignments yet.
        </p>
      ) : (
        deliveries.map((delivery) => {
          const requiredDriverRole = courierSignoffRole(delivery.driver?.classification);
          const hasDriverSignoff = delivery.signoffs.some(
            (signoff) => signoff.role === requiredDriverRole && signoff.attested,
          );
          const hasRecipientSignoff = delivery.signoffs.some(
            (signoff) => signoff.role === "RECIPIENT" && signoff.attested,
          );
          const packetTasksComplete =
            delivery.checklistItems.length > 0 &&
            delivery.checklistItems.every(
              (item) => !item.required || item.status === "COMPLETED" || item.status === "WAIVED",
            );
          const packetReady =
            packetTasksComplete &&
            hasDriverSignoff &&
            (!delivery.proofOfDeliveryRequired || hasRecipientSignoff);
          const assignmentDocuments = deliveryDocuments.filter((document) =>
            document.deliveryLinks.some((link) => link.delivery.id === delivery.id),
          );

          return (
            <article key={delivery.id} className="rounded-2xl border border-line bg-paper p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-medical">{delivery.deliveryNumber}</p>
              {delivery.contract || delivery.routeTemplate ? (
                <p className="mt-1 text-xs text-muted">
                  {delivery.contract?.contractNumber ?? "Contract route"}
                  {delivery.routeTemplate ? " · " + delivery.routeTemplate.name : ""}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-navy">{delivery.status.replaceAll("_", " ")}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  packetReady ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {packetReady ? "Packet ready" : "Packet incomplete"}
                </span>
              </div>

              <div className="mt-3 grid gap-1 text-sm">
                <p><span className="font-semibold">Pickup:</span> {delivery.pickupBusinessName ? delivery.pickupBusinessName + " · " : ""}{delivery.pickupAddress}</p>
                <p><span className="font-semibold">Delivery:</span> {delivery.deliveryBusinessName ? delivery.deliveryBusinessName + " · " : ""}{delivery.deliveryAddress}</p>
                <p className="text-muted">
                  Pickup {formatBusinessDateTime(delivery.pickupAt)} · Due {formatBusinessDateTime(delivery.deliverBy)} · Eastern Time
                </p>
                {delivery.customerInstructions ? <p><span className="font-semibold">Customer:</span> {delivery.customerInstructions}</p> : null}
                {delivery.handlingInstructions ? <p><span className="font-semibold">Handling:</span> {delivery.handlingInstructions}</p> : null}
                {delivery.temperatureRequired ? <p><span className="font-semibold">Temperature:</span> {delivery.temperatureRequired}</p> : null}
                {delivery.chainOfCustodyRequired ? <p className="font-semibold text-navy">Chain of custody required</p> : null}
              </div>

              <div className="mt-5 rounded-2xl border border-line bg-ice p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-navy">Route assignment packet</h3>
                    <p className="text-xs text-muted">Required tasks, paperwork, and sign-offs stay with this assignment.</p>
                  </div>
                  <span className="text-xs font-semibold text-muted">
                    {delivery.checklistItems.filter((item) => item.status === "COMPLETED").length}/{delivery.checklistItems.length} tasks complete
                  </span>
                </div>

                {delivery.checklistItems.length === 0 ? (
                  <form action={initializeDeliveryPacket.bind(null, delivery.id)} className="mt-4">
                    <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
                      Initialize route packet
                    </button>
                  </form>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {delivery.checklistItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-line bg-paper p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-navy">{item.label}</p>
                            <p className="mt-1 text-xs text-muted">{item.required ? "Required" : "Optional"} · {item.status}</p>
                            {item.completedAt ? <p className="mt-1 text-xs text-muted">Completed {formatBusinessDateTime(item.completedAt)}</p> : null}
                            {item.note ? <p className="mt-1 text-xs text-muted">{item.note}</p> : null}
                          </div>
                          {item.status !== "COMPLETED" ? (
                            <form action={setDeliveryChecklistItem.bind(null, item.id)} className="grid min-w-40 gap-2">
                              <input type="hidden" name="status" value="COMPLETED" />
                              <input name="note" placeholder="Note (optional)" className="rounded-lg border border-line px-2 py-2 text-xs" />
                              <button className="rounded-full bg-medical px-3 py-2 text-xs font-semibold text-white">Complete</button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 border-t border-line pt-4">
                  <h4 className="text-sm font-semibold text-navy">Sign-offs</h4>
                  {delivery.signoffs.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted">
                      {delivery.signoffs.map((signoff) => (
                        <li key={signoff.id}>
                          {signoff.role} · {signoff.signerName} · {formatBusinessDateTime(signoff.signedAt)}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-2 text-xs text-muted">No sign-offs recorded yet.</p>}

                  {!hasDriverSignoff ? (
                    <form action={signDeliveryPacket.bind(null, delivery.id)} className="mt-4 grid gap-2 rounded-xl border border-line bg-paper p-3 sm:grid-cols-2">
                      <input type="hidden" name="role" value={requiredDriverRole} />
                      <p className="text-sm font-semibold text-navy sm:col-span-2">
                        {requiredDriverRole === "CONTRACTOR" ? "Contractor certification" : "Courier certification"}
                      </p>
                      <input name="signerName" required defaultValue={delivery.driver ? `${delivery.driver.legalFirstName} ${delivery.driver.legalLastName}` : ""} placeholder="Full name" className="rounded-lg border border-line px-3 py-2 text-sm" />
                      <input name="signatureText" required placeholder="Type full name as signature" className="rounded-lg border border-line px-3 py-2 text-sm" />
                      <label className="flex items-start gap-2 text-xs text-muted sm:col-span-2">
                        <input name="attested" type="checkbox" required className="mt-0.5" />
                        I certify that I completed the assigned route tasks and that the information recorded in this packet is accurate.
                      </label>
                      <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Sign route packet</button>
                    </form>
                  ) : null}

                  {delivery.proofOfDeliveryRequired && !hasRecipientSignoff ? (
                    <form action={signDeliveryPacket.bind(null, delivery.id)} className="mt-4 grid gap-2 rounded-xl border border-line bg-paper p-3 sm:grid-cols-2">
                      <input type="hidden" name="role" value="RECIPIENT" />
                      <p className="text-sm font-semibold text-navy sm:col-span-2">Recipient sign-off</p>
                      <input name="signerName" required placeholder="Recipient full name" className="rounded-lg border border-line px-3 py-2 text-sm" />
                      <input name="signerTitle" placeholder="Title / department" className="rounded-lg border border-line px-3 py-2 text-sm" />
                      <input name="signatureText" required placeholder="Recipient typed signature" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
                      <label className="flex items-start gap-2 text-xs text-muted sm:col-span-2">
                        <input name="attested" type="checkbox" required className="mt-0.5" />
                        Recipient acknowledges receipt of this delivery in the condition recorded by the courier.
                      </label>
                      <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Record recipient sign-off</button>
                    </form>
                  ) : null}
                </div>

                {hasPermission(ctx, "documents.view") ? (
                  <div className="mt-5 border-t border-line pt-4">
                    <h4 className="text-sm font-semibold text-navy">Assignment paperwork</h4>
                    {assignmentDocuments.length === 0 ? (
                      <p className="mt-1 text-sm text-muted">No files attached to this assignment.</p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm">
                        {assignmentDocuments.map((document) => (
                          <li key={document.id} className="flex flex-wrap items-center justify-between gap-2">
                            <span>{document.name} · {labelDocumentType(document.documentType)}</span>
                            {hasPermission(ctx, "documents.download") ? (
                              <a href={documentFileHref(document.id)} className="font-semibold text-medical">View / Download</a>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {driverProgressActions(delivery.status).map(([status, label]) => (
                  <form action={updateDeliveryStatus} key={status}>
                    <input type="hidden" name="deliveryId" value={delivery.id} />
                    <input type="hidden" name="status" value={status} />
                    <button className="min-h-11 w-full rounded-xl bg-navy px-3 py-3 text-sm font-semibold text-white">
                      {label}
                    </button>
                  </form>
                ))}
              </div>

              <form action={updateDeliveryStatus} className="mt-3 grid gap-2">
                <input type="hidden" name="deliveryId" value={delivery.id} />
                <input type="hidden" name="status" value="DELIVERED" />
                <input name="deliveryNotes" placeholder="Final delivery notes (optional)" className="rounded-lg border border-line px-3 py-3 text-sm" />
                <button
                  disabled={!packetReady}
                  className="min-h-11 rounded-xl bg-medical px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Complete delivery
                </button>
                {!packetReady ? <p className="text-xs text-amber-700">Finish required route tasks and sign-offs before completing delivery.</p> : null}
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
                <button className="min-h-11 rounded-xl border border-line px-3 py-3 text-sm font-semibold text-navy">Report issue</button>
              </form>
            </article>
          );
        })
      )}
    </div>
  );
}
