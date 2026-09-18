import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Workforce" };

export default async function WorkforcePage() {
  await requirePermission("scheduling.view");
  const now = new Date();
  const since = new Date(now.getTime() - 45 * 86_400_000);

  const [
    upcomingShifts,
    totalUpcomingShiftRecords,
    openTimecards,
    totalRecentTimecards,
    pendingTimeOff,
    totalTimeOffRequests,
    unacknowledgedCallOffs,
    totalCallOffs,
  ] = await Promise.all([
    prisma.employeeShift.count({
      where: { startsAt: { gte: now }, status: { in: ["DRAFT", "PUBLISHED"] } },
    }),
    prisma.employeeShift.count({ where: { startsAt: { gte: now } } }),
    prisma.timeEntry.count({ where: { status: { in: ["OPEN", "SUBMITTED"] } } }),
    prisma.timeEntry.count({ where: { clockIn: { gte: since } } }),
    prisma.timeOffRequest.count({ where: { status: "PENDING" } }),
    prisma.timeOffRequest.count(),
    prisma.callOffRequest.count({ where: { status: "REPORTED" } }),
    prisma.callOffRequest.count(),
  ]);

  const cards = [
    {
      label: "Upcoming shifts",
      value: upcomingShifts,
      href: "/dashboard/workforce/schedule",
      body: "Build and publish employee schedules.",
      context: `${totalUpcomingShiftRecords} total upcoming shift record${totalUpcomingShiftRecords === 1 ? "" : "s"}`,
    },
    {
      label: "Open timecards",
      value: openTimecards,
      href: "/dashboard/workforce/timecards",
      body: "Review clock records and approvals.",
      context: `${totalRecentTimecards} timecard${totalRecentTimecards === 1 ? "" : "s"} in the last 45 days`,
    },
    {
      label: "Pending time off",
      value: pendingTimeOff,
      href: "/dashboard/workforce/time-off",
      body: "Approve PTO, sick, and unpaid requests.",
      context: `${totalTimeOffRequests} total request${totalTimeOffRequests === 1 ? "" : "s"} on record`,
    },
    {
      label: "Call-offs to review",
      value: unacknowledgedCallOffs,
      href: "/dashboard/workforce/time-off#call-offs",
      body: "Acknowledge call-offs and keep the operation covered.",
      context: `${totalCallOffs} total call-off${totalCallOffs === 1 ? "" : "s"} on record`,
    },
  ];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">People operations</p>
      <h1 className="mt-2 text-3xl font-semibold text-navy">Workforce</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Scheduling, timecards, PTO and call-offs are stored in the portal database so managers and employees work from the same record.
      </p>
      <p className="mt-2 max-w-3xl text-xs text-muted">
        Large numbers show items that currently need action. The line below each card shows the total records so completed or approved work does not disappear from view.
      </p>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-2xl border border-line bg-paper p-5 transition hover:border-medical">
            <p className="text-sm font-semibold text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-navy">{card.value}</p>
            <p className="mt-2 text-sm text-muted">{card.body}</p>
            <p className="mt-3 text-xs font-semibold text-medical">{card.context}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
