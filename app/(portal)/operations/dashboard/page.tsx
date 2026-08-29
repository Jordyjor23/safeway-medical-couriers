import { prisma } from "@/lib/db";
import { getDocumentAlertStats } from "@/lib/documents/alert-stats";
import { requirePortal } from "@/lib/rbac";

export default async function OperationsDashboardPage() {
  await requirePortal("operations");
  const [activeDrivers, openDeliveries, exceptions, incidents, documentAlerts] = await Promise.all([
    prisma.employee.count({ where: { isDriver: true, status: "ACTIVE" } }),
    prisma.delivery.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
    prisma.delivery.count({ where: { status: "EXCEPTION" } }),
    prisma.incidentReport.count({ where: { status: "OPEN" } }),
    getDocumentAlertStats(),
  ]);
  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Operations dashboard</h1>
      <p className="mt-2 text-sm text-muted">Active work, coverage, and exceptions. Payroll and owner settings are not shown.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active drivers" value={activeDrivers} />
        <Stat label="Open deliveries" value={openDeliveries} />
        <Stat label="Exceptions" value={exceptions} />
        <Stat label="Open incidents" value={incidents} />
        <Stat label="Expiring in 30 days" value={documentAlerts.expiringIn30Days} />
        <Stat label="Expired" value={documentAlerts.expired} />
        <Stat label="Needs review" value={documentAlerts.needsReview} />
        <Stat label="Action required" value={documentAlerts.actionRequired} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-navy">{value}</p>
    </div>
  );
}
