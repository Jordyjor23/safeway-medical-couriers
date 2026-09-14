import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDashboardOverview } from "@/lib/dashboard-stats";
import { getDocumentAlertStats } from "@/lib/documents/alert-stats";
import { hasPermission, requirePortal } from "@/lib/rbac";

export default async function AdminDashboardPage() {
  const ctx = await requirePortal("admin");
  const overview = await getDashboardOverview(ctx);
  const documentAlerts =
    hasPermission(ctx, "documents.view") || hasPermission(ctx, "compliance.view")
      ? await getDocumentAlertStats()
      : { expiringIn30Days: 0, expired: 0, missingDocuments: 0, needsReview: 0, actionRequired: 0 };
  const [employees, customers, deliveries] = await Promise.all([
    overview.visibility.employees ? prisma.employee.count({ where: { status: "ACTIVE" } }) : Promise.resolve(0),
    overview.visibility.customers ? prisma.customer.count({ where: { status: "ACTIVE" } }) : Promise.resolve(0),
    prisma.delivery.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
  ]);
  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Admin dashboard</h1>
      <p className="mt-2 text-sm text-muted">Daily operations. Owner security settings are not included.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Active employees</p>
          <p className="mt-2 text-3xl font-semibold text-navy">{employees}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Active customers</p>
          <p className="mt-2 text-3xl font-semibold text-navy">{customers}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Open deliveries</p>
          <p className="mt-2 text-3xl font-semibold text-navy">{deliveries}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Expiring in 30 days</p>
          <p className="mt-2 text-3xl font-semibold text-navy">{documentAlerts.expiringIn30Days}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Expired</p>
          <p className="mt-2 text-3xl font-semibold text-navy">{documentAlerts.expired}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Missing documents</p>
          <p className="mt-2 text-3xl font-semibold text-navy">{documentAlerts.missingDocuments}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Needs review</p>
          <p className="mt-2 text-3xl font-semibold text-navy">{documentAlerts.needsReview}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Action required</p>
          <p className="mt-2 text-3xl font-semibold text-navy">{documentAlerts.actionRequired}</p>
        </div>
      </div>
      <p className="mt-6 text-sm">
        <Link href="/dashboard/employees" className="font-semibold text-medical hover:underline">
          Open employee records
        </Link>
        {" · "}
        <Link href="/dashboard/documents/alerts" className="font-semibold text-medical hover:underline">
          Document alerts
        </Link>
      </p>
    </div>
  );
}
