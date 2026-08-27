import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Employee" };

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requirePermission("employees.view");
  const { employeeId } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      onboarding: { include: { steps: true } },
      trainings: true,
      certifications: true,
      complianceRecords: { include: { requirement: true } },
      newHireReport: true,
    },
  });
  if (!employee) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">{employee.employeeNumber}</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">{employee.legalFirstName} {employee.legalLastName}</h1>
        <p className="text-muted">{employee.jobTitle} · {employee.status.replaceAll("_", " ")}</p>
      </div>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Onboarding</h2>
        <p className="mt-2 text-sm text-muted">
          Identity, tax, I-9, and SSN collection belong in this restricted workflow — not the public application.
        </p>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {employee.onboarding?.steps.map((step) => (
            <li key={step.id}>{step.key.replaceAll("_", " ")} · {step.status.replaceAll("_", " ")}</li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Ohio new-hire reporting</h2>
        <p className="mt-2 text-sm text-muted">
          Tracking only. Information is not transmitted to Ohio unless an authorized integration is enabled.
        </p>
        <p className="mt-2 text-sm">Status: {employee.newHireReport?.status ?? "NOT READY"}</p>
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Training / tracking</h2>
        {employee.trainings.length === 0 ? <p className="mt-2 text-sm text-muted">No training records.</p> : null}
        <ul className="mt-2 text-sm">
          {employee.trainings.map((training) => (
            <li key={training.id}>{training.title} · expires {training.expiresAt?.toLocaleDateString() ?? "n/a"}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
