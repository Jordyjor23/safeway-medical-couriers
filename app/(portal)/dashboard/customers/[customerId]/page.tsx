import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addCustomerContact, updateCustomer } from "@/app/(portal)/dashboard/customers/actions";
import { documentUploadCapabilities } from "@/app/(portal)/dashboard/documents/actions";
import { DocumentUploader } from "@/components/portal/DocumentUploader";
import { EntityDocumentsSection } from "@/components/portal/EntityDocumentsSection";
import { canAssociateCustomer } from "@/lib/documents/access";
import { CUSTOMER_DOCUMENT_GROUPS } from "@/lib/documents/groups";
import { DOCUMENT_LIST_INCLUDE, documentLibraryWhere } from "@/lib/documents/query";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Customer" };

const types = [
  "HOSPITAL",
  "LABORATORY",
  "PHARMACY",
  "CLINIC",
  "DENTAL",
  "HOME_HEALTHCARE",
  "MEDICAL_SUPPLIER",
  "VETERINARY",
  "RESEARCH",
  "OTHER_BUSINESS",
];
const statuses = ["PROSPECT", "LEAD", "PROPOSAL_SENT", "NEGOTIATION", "ACTIVE", "INACTIVE", "FORMER"];
const fieldClass = "mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const ctx = await requirePermission("customers.view");
  const { customerId } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { contacts: true, contracts: true },
  });
  if (!customer) notFound();
  const canEdit = hasPermission(ctx, "customers.edit");
  const canViewDocs = hasPermission(ctx, "documents.view");
  const [documents, capabilities] = canViewDocs
    ? await Promise.all([
        prisma.managedDocument.findMany({
          where: documentLibraryWhere(ctx, { customerId, archived: "all" }),
          include: DOCUMENT_LIST_INCLUDE,
          orderBy: { createdAt: "desc" },
        }),
        documentUploadCapabilities(),
      ])
    : [[], null];
  const saveCustomer = updateCustomer.bind(null, customer.id);
  const addContact = addCustomerContact.bind(null, customer.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/customers" className="text-sm font-semibold text-medical hover:underline">
          ← Customers
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-navy">{customer.legalName}</h1>
        <p className="text-muted">
          {customer.status.replaceAll("_", " ")} · {customer.customerType.replaceAll("_", " ")}
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Profile</h2>
        {canEdit ? (
          <form action={saveCustomer} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-navy">
              Legal name
              <input name="legalName" defaultValue={customer.legalName} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              DBA
              <input name="dba" defaultValue={customer.dba ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Type
              <select name="customerType" defaultValue={customer.customerType} className={fieldClass}>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Status
              <select name="status" defaultValue={customer.status} className={fieldClass}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Email
              <input name="email" type="email" defaultValue={customer.email ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Phone
              <input name="phone" defaultValue={customer.phone ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Website
              <input name="website" defaultValue={customer.website ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Address
              <input name="addressLine1" defaultValue={customer.addressLine1 ?? ""} className={fieldClass} />
            </label>
            <input name="addressLine2" defaultValue={customer.addressLine2 ?? ""} placeholder="Address line 2" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
            <input name="city" defaultValue={customer.city ?? ""} placeholder="City" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="state" defaultValue={customer.state ?? ""} placeholder="State" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="zip" defaultValue={customer.zip ?? ""} placeholder="ZIP" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Service requirements
              <textarea name="serviceRequirements" rows={3} defaultValue={customer.serviceRequirements ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Notes
              <textarea name="notes" rows={3} defaultValue={customer.notes ?? ""} className={fieldClass} />
            </label>
            <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
              Save customer
            </button>
          </form>
        ) : (
          <div className="mt-3 space-y-1 text-sm">
            <p>Email: {customer.email ?? "—"}</p>
            <p>Phone: {customer.phone ?? "—"}</p>
            <p>Website: {customer.website ?? "—"}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Contacts</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {customer.contacts.length === 0 ? (
            <li className="text-muted">No contacts yet.</li>
          ) : (
            customer.contacts.map((contact) => (
              <li key={contact.id}>
                {contact.name}
                {contact.role ? ` · ${contact.role}` : ""} · {contact.email ?? "no email"} ·{" "}
                {contact.phone ?? "no phone"}
              </li>
            ))
          )}
        </ul>
        {canEdit ? (
          <form action={addContact} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Contact name" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="role" placeholder="Role" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="Email" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="phone" placeholder="Phone" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input name="isPrimary" type="checkbox" /> Primary
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="isBilling" type="checkbox" /> Billing
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="isOperations" type="checkbox" /> Operations
            </label>
            <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:w-fit">
              Add contact
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Contracts</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {customer.contracts.length === 0 ? (
            <li className="text-muted">
              No associated contracts.{" "}
              <Link href="/dashboard/contracts" className="font-semibold text-medical hover:underline">
                Add a contract
              </Link>
            </li>
          ) : (
            customer.contracts.map((contract) => (
              <li key={contract.id}>
                <Link href={`/dashboard/contracts/${contract.id}`} className="font-medium text-navy hover:text-medical">
                  {contract.contractNumber}
                </Link>{" "}
                · {contract.status.replaceAll("_", " ")}
              </li>
            ))
          )}
        </ul>
      </section>

      {canViewDocs ? (
        <EntityDocumentsSection
          title="Documents"
          documents={documents}
          groups={CUSTOMER_DOCUMENT_GROUPS}
          canDownload={hasPermission(ctx, "documents.download")}
          canUpload={Boolean(capabilities?.canUpload && canAssociateCustomer(ctx, customer.id))}
          emptyBody="No authorized customer files yet."
        >
          <DocumentUploader
            associations={capabilities?.associations ?? { employee: false, customer: false, contract: false, delivery: false }}
            preset={{
              customerId: customer.id,
              customerLabel: customer.legalName,
              category: "CUSTOMER_CONTRACTS",
            }}
          />
        </EntityDocumentsSection>
      ) : null}
    </div>
  );
}
