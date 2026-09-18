import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "HR & Onboarding" };

export default async function HrOnboardingPage() {
  const ctx = await requirePermission("employees.view");
  const canViewApplicants = hasPermission(ctx, "applicants.view");
  const canViewDocuments = hasPermission(ctx, "documents.view");

  const [pendingEmployees, activeEmployees, candidateCounts, pendingDocumentReview] = await Promise.all([
    prisma.employee.count({ where: { status: "PENDING_ONBOARDING" } }),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    canViewApplicants
      ? prisma.application.groupBy({
          by: ["status"],
          where: {
            status: {
              in: ["CONDITIONAL_OFFER", "BACKGROUND_SCREENING", "ONBOARDING"],
            },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    canViewDocuments
      ? prisma.managedDocument.count({
          where: {
            OR: [
              { employeeLinks: { some: {} } },
              { applicantLinks: { some: {} } },
            ],
            archivedAt: null,
            verificationStatus: "UNVERIFIED",
            lifecycleStatus: { notIn: ["ARCHIVED", "SUPERSEDED", "REJECTED"] },
          },
        })
      : Promise.resolve(0),
  ]);

  const countFor = (status: string) =>
    candidateCounts.find((row) => row.status === status)?._count._all ?? 0;

  const cards = [
    {
      label: "Conditional offers",
      value: countFor("CONDITIONAL_OFFER"),
      href: "/dashboard/applicants?status=CONDITIONAL_OFFER",
      visible: canViewApplicants,
    },
    {
      label: "Background screening",
      value: countFor("BACKGROUND_SCREENING"),
      href: "/dashboard/applicants?status=BACKGROUND_SCREENING",
      visible: canViewApplicants,
    },
    {
      label: "Candidate onboarding",
      value: countFor("ONBOARDING"),
      href: "/dashboard/applicants?status=ONBOARDING",
      visible: canViewApplicants,
    },
    {
      label: "Employee onboarding",
      value: pendingEmployees,
      href: "/dashboard/employees?status=PENDING_ONBOARDING",
      visible: true,
    },
    {
      label: "Active employees",
      value: activeEmployees,
      href: "/dashboard/employees?status=ACTIVE",
      visible: true,
    },
    {
      label: "Documents awaiting review",
      value: pendingDocumentReview,
      href: "/dashboard/documents/review",
      visible: canViewDocuments,
    },
  ].filter((item) => item.visible);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">
        People operations
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-navy">HR & Onboarding</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Manage the path from candidate to active worker, including onboarding documents,
        classification, agreements, and employee records.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-line bg-paper p-5 transition hover:border-medical"
          >
            <p className="text-sm font-semibold text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-navy">{card.value}</p>
            <p className="mt-3 text-xs font-semibold text-medical">Open →</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">HR workflow</h2>
        <p className="mt-1 text-xs text-muted">
          Use these steps as navigation. Each worker’s individual onboarding checklist and status are edited on their employee profile.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {[
            ["1", "Applicant", "Review application and interview", canViewApplicants ? "/dashboard/applicants" : "/dashboard/employees"],
            ["2", "Conditional offer", "Start pre-hire requirements", canViewApplicants ? "/dashboard/applicants?status=CONDITIONAL_OFFER" : "/dashboard/employees"],
            ["3", "Onboarding", "Secure uploads + W-2/1099 paperwork", canViewApplicants ? "/dashboard/applicants?status=ONBOARDING" : "/dashboard/employees?status=PENDING_ONBOARDING"],
            ["4", "HR review", "Verify documents and finish checklist", canViewDocuments ? "/dashboard/documents/review" : "/dashboard/employees?status=PENDING_ONBOARDING"],
            ["5", "Active", "Employee/courier enters workforce", "/dashboard/employees?status=ACTIVE"],
          ].map(([number, title, body, href]) => (
            <Link
              key={number}
              href={href}
              className="rounded-xl border border-line bg-ice p-4 transition hover:border-medical hover:bg-white"
            >
              <p className="text-xs font-bold text-medical">{number}</p>
              <p className="mt-1 font-semibold text-navy">{title}</p>
              <p className="mt-1 text-xs text-muted">{body}</p>
              <p className="mt-3 text-xs font-semibold text-medical">Open →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/hr/qualifications" className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-semibold text-navy">Route qualification matrix</h2>
          <p className="mt-2 text-sm text-muted">
            See which contracts and routes each courier is credential-eligible for, and what they are missing.
          </p>
          <p className="mt-3 text-sm font-semibold text-medical">Open qualification matrix →</p>
        </Link>
        {canViewApplicants ? (
          <Link href="/dashboard/applicants" className="rounded-2xl border border-line bg-paper p-5">
            <h2 className="font-semibold text-navy">Recruiting & applicants</h2>
            <p className="mt-2 text-sm text-muted">
              Applications, interviews, offers, screening, and candidate onboarding links.
            </p>
            <p className="mt-3 text-sm font-semibold text-medical">Open applicants →</p>
          </Link>
        ) : null}
        <Link href="/dashboard/employees" className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-semibold text-navy">Employee records & onboarding</h2>
          <p className="mt-2 text-sm text-muted">
            W-2/1099 classification, profile status, onboarding checklist, documents, and activation.
          </p>
          <p className="mt-3 text-sm font-semibold text-medical">Open employees →</p>
        </Link>
      </section>
    </div>
  );
}
