import type { Metadata } from "next";
import Link from "next/link";
import { StatCard } from "@/components/portal/StatCard";
import { getDashboardOverview } from "@/lib/dashboard-stats";
import { isOwnerRole } from "@/lib/permissions";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const ctx = await requireAuth();
  const stats = await getDashboardOverview();
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
          Owner accounts should enable multi-factor authentication.{" "}
          <Link href="/dashboard/security" className="font-semibold underline">
            Set up MFA
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active employees" value={stats.activeEmployees} href="/dashboard/employees" />
        <StatCard label="Active couriers" value={stats.activeCouriers} href="/dashboard/employees" />
        <StatCard label="Pending applicants" value={stats.pendingApplicants} href="/dashboard/applicants" />
        <StatCard label="Applications this month" value={stats.applicationsThisMonth} href="/dashboard/applicants" />
        <StatCard label="Open positions" value={stats.openPositions} href="/dashboard/jobs" />
        <StatCard label="Active customers" value={stats.activeCustomers} href="/dashboard/customers" />
        <StatCard label="Prospective customers" value={stats.prospectiveCustomers} href="/dashboard/customers" />
        <StatCard label="Active contracts" value={stats.activeContracts} href="/dashboard/contracts" />
        <StatCard label="Contracts expiring soon" value={stats.contractsExpiringSoon} href="/dashboard/contracts" />
        <StatCard label="Pending contracts" value={stats.pendingContracts} href="/dashboard/contracts" />
        <StatCard label="Documents expiring soon" value={stats.documentsExpiringSoon} href="/dashboard/documents" />
        <StatCard label="Compliance alerts" value={stats.complianceAlerts} href="/dashboard/compliance" />
        <StatCard label="Training expirations" value={stats.upcomingTrainingExpirations} href="/dashboard/compliance" />
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
