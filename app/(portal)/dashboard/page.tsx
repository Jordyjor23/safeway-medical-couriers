import type { Metadata } from "next";
import Link from "next/link";
import { StatCard } from "@/components/portal/StatCard";
import { getDashboardOverview } from "@/lib/dashboard-stats";
import { getDocumentAlertStats } from "@/lib/documents/alert-stats";
import { isOwnerRole } from "@/lib/permissions";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const ctx = await requireAuth();
  const stats = await getDashboardOverview(ctx);
  const documentAlerts = stats.visibility.documents || stats.visibility.compliance
    ? await getDocumentAlertStats()
    : { expiringIn30Days: 0, expired: 0, missingDocuments: 0, needsReview: 0, actionRequired: 0 };
  const owner = isOwnerRole(ctx.roles);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">
        Command center
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-navy">Welcome back, {ctx.user.name}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Who works here, who has applied, which customers and contracts need attention, and what
        changed recently — using live records, not estimates.
      </p>

      {owner && !ctx.user.twoFactorEnabled ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Owner accounts should enable multi-factor authentication and replace the temporary
          password.{" "}
          <Link href="/dashboard/security" className="font-semibold underline">
            Change password / set up MFA
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.visibility.employees ? <StatCard label="Active employees" value={stats.activeEmployees} href="/dashboard/employees" /> : null}
        {stats.visibility.employees ? <StatCard label="Active couriers" value={stats.activeCouriers} href="/dashboard/employees" /> : null}
        {stats.visibility.applicants ? <StatCard label="Pending applicants" value={stats.pendingApplicants} href="/dashboard/applicants" /> : null}
        {stats.visibility.applicants ? <StatCard label="Applications this month" value={stats.applicationsThisMonth} href="/dashboard/applicants" /> : null}
        {stats.visibility.applicants ? <StatCard label="Applications awaiting review" value={stats.awaitingReview} href="/dashboard/applicants" /> : null}
        {stats.visibility.jobs ? <StatCard label="Open positions" value={stats.openPositions} href="/dashboard/jobs" /> : null}
        {stats.visibility.customers ? <StatCard label="Active customers" value={stats.activeCustomers} href="/dashboard/customers" /> : null}
        {stats.visibility.customers ? <StatCard label="Prospective customers" value={stats.prospectiveCustomers} href="/dashboard/customers" /> : null}
        {stats.visibility.contracts ? <StatCard label="Active contracts" value={stats.activeContracts} href="/dashboard/contracts" /> : null}
        {stats.visibility.contracts ? <StatCard label="Contracts expiring soon" value={stats.contractsExpiringSoon} href="/dashboard/contracts" /> : null}
        {stats.visibility.contracts ? <StatCard label="Pending contracts" value={stats.pendingContracts} href="/dashboard/contracts" /> : null}
        {stats.visibility.documents ? <StatCard label="Expiring in 30 days" value={documentAlerts.expiringIn30Days} href="/dashboard/documents/alerts" /> : null}
        {stats.visibility.documents ? <StatCard label="Expired" value={documentAlerts.expired} href="/dashboard/documents/alerts?expirationWindow=expired" /> : null}
        {stats.visibility.documents ? <StatCard label="Missing documents" value={documentAlerts.missingDocuments} href="/dashboard/documents/alerts" /> : null}
        {stats.visibility.documents ? <StatCard label="Needs review" value={documentAlerts.needsReview} href="/dashboard/documents/review" /> : null}
        {stats.visibility.documents ? <StatCard label="Action required" value={documentAlerts.actionRequired} href="/dashboard/documents/alerts" /> : null}
        {stats.visibility.documents ? <StatCard label="Documents expiring soon" value={stats.documentsExpiringSoon} href="/dashboard/documents" /> : null}
        {stats.visibility.compliance ? <StatCard label="Compliance alerts" value={stats.complianceAlerts} href="/dashboard/compliance" /> : null}
        {stats.visibility.compliance ? <StatCard label="Training expirations" value={stats.upcomingTrainingExpirations} href="/dashboard/compliance" /> : null}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-navy">Recent activity</h2>
        {stats.recentActivity.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line bg-paper px-4 py-8 text-sm text-muted">
            No audit activity yet. Portal actions will appear here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
            {stats.recentActivity.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium text-navy">{item.action}</span>
                <span className="text-muted">{item.targetType}</span>
                <span className="text-muted">{item.actorEmail ?? "system"}</span>
                <time className="text-muted" dateTime={item.createdAt.toISOString()}>
                  {item.createdAt.toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
