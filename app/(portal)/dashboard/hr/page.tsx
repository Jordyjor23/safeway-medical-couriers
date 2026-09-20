import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "HR & Onboarding" };

export default async function HrOnboardingPage() {
  const ctx = await requirePermission("employees.view");
  const canViewApplicants = hasPermission(ctx, "applicants.view");
  const canViewDocuments = hasPermission(ctx, "documents.view");

  const [
    pendingEmployees,
    activeEmployees,
    candidateCounts,
    pendingDocumentReview,
    readyForAssignment,
  ] = await Promise.all([
    prisma.employee.count({ where: { status: "PENDING_ONBOARDING" } }),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    canViewApplicants
      ? prisma.application.groupBy({
          by: ["status"],
          where: {
            status: {
              in: [
                "SUBMITTED",
                "UNDER_REVIEW",
                "INTERVIEW_REQUESTED",
                "INTERVIEW_SCHEDULED",
                "CONDITIONAL_OFFER",
                "BACKGROUND_SCREENING",
                "ONBOARDING",
                "HIRED",
              ],
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
    prisma.onboardingStep.count({
      where: {
        key: "READY_FOR_ASSIGNMENT",
        status: { in: ["COMPLETED", "NOT_APPLICABLE"] },
        checklist: { employee: { status: "PENDING_ONBOARDING" } },
      },
    }),
  ]);

  const countFor = (status: string) =>
    candidateCounts.find((row) => row.status === status)?._count._all ?? 0;

  const applicantReviewCount = countFor("SUBMITTED") + countFor("UNDER_REVIEW");
  const interviewCount = countFor("INTERVIEW_REQUESTED") + countFor("INTERVIEW_SCHEDULED");

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

      <form action="/dashboard/employees" method="get" className="mt-6 rounded-2xl border border-line bg-paper p-4">
        <label className="text-sm font-semibold text-navy">
          Find an employee
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              name="q"
              placeholder="Search name, employee ID, email, phone, title, or department"
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2.5 text-sm"
            />
            <button className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white">
              Search directory
            </button>
          </div>
        </label>
      </form>

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-navy">HR workflow</h2>
            <p className="mt-1 max-w-3xl text-xs text-muted">
              Follow the full candidate-to-workforce path. Counts update from the live applicant,
              document-review, onboarding, and employee records.
            </p>
          </div>
          <span className="rounded-full bg-ice px-3 py-1 text-xs font-semibold text-navy">
            9 stages
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              number: "1",
              title: "Applicant review",
              body: "New submissions and applications under review.",
              value: applicantReviewCount,
              href: canViewApplicants ? "/dashboard/applicants" : "/dashboard/employees",
            },
            {
              number: "2",
              title: "Interview",
              body: "Interview requested or scheduled.",
              value: interviewCount,
              href: canViewApplicants ? "/dashboard/interviews" : "/dashboard/employees",
            },
            {
              number: "3",
              title: "Conditional offer",
              body: "Start pre-hire requirements and candidate acceptance.",
              value: countFor("CONDITIONAL_OFFER"),
              href: canViewApplicants
                ? "/dashboard/applicants?status=CONDITIONAL_OFFER"
                : "/dashboard/employees",
            },
            {
              number: "4",
              title: "Background screening",
              body: "Track screening, MVR, and pre-employment checks.",
              value: countFor("BACKGROUND_SCREENING"),
              href: canViewApplicants
                ? "/dashboard/applicants?status=BACKGROUND_SCREENING"
                : "/dashboard/employees",
            },
            {
              number: "5",
              title: "Candidate onboarding",
              body: "Secure uploads, certifications, and candidate paperwork.",
              value: countFor("ONBOARDING"),
              href: canViewApplicants
                ? "/dashboard/applicants?status=ONBOARDING"
                : "/dashboard/employees?status=PENDING_ONBOARDING",
            },
            {
              number: "6",
              title: "Employee record created",
              body: "Worker record created and pending workforce activation.",
              value: pendingEmployees,
              href: "/dashboard/employees?status=PENDING_ONBOARDING",
            },
            {
              number: "7",
              title: "HR & document review",
              body: "Verify documents and complete the onboarding checklist.",
              value: pendingDocumentReview,
              href: canViewDocuments
                ? "/dashboard/documents/review"
                : "/dashboard/employees?status=PENDING_ONBOARDING",
            },
            {
              number: "8",
              title: "Ready for assignment",
              body: "Onboarding gate completed and worker can be activated.",
              value: readyForAssignment,
              href: "/dashboard/employees?status=PENDING_ONBOARDING",
            },
            {
              number: "9",
              title: "Active",
              body: "Employee or courier is active in the workforce.",
              value: activeEmployees,
              href: "/dashboard/employees?status=ACTIVE",
            },
          ].map((step) => (
            <Link
              key={step.number}
              href={step.href}
              className="group rounded-xl border border-line bg-ice p-4 transition hover:border-medical hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-medical">Stage {step.number}</p>
                  <p className="mt-1 font-semibold text-navy">{step.title}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-navy shadow-sm">
                  {step.value}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">{step.body}</p>
              <p className="mt-3 text-xs font-semibold text-medical group-hover:underline">Open →</p>
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
