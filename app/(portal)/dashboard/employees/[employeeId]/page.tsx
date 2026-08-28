import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addEmployeeTraining,
  updateEmployee,
  updateNewHireReport,
  updateOnboardingStep,
} from "@/app/(portal)/dashboard/employees/actions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Employee" };

const fieldClass = "mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm";

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const ctx = await requirePermission("employees.view");
  const { employeeId } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      onboarding: { include: { steps: { orderBy: { key: "asc" } } } },
      trainings: true,
      certifications: true,
      complianceRecords: { include: { requirement: true } },
      newHireReport: true,
    },
  });
  if (!employee) notFound();
  const canEdit = hasPermission(ctx, "employees.edit");
  const updateProfile = updateEmployee.bind(null, employee.id);
  const updateStep = updateOnboardingStep.bind(null, employee.id);
  const addTraining = addEmployeeTraining.bind(null, employee.id);
  const updateHire = updateNewHireReport.bind(null, employee.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/employees" className="text-sm font-semibold text-medical hover:underline">
          ← Employees
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-medical">
          {employee.employeeNumber}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">
          {employee.legalFirstName} {employee.legalLastName}
        </h1>
        <p className="text-muted">
          {employee.jobTitle} · {employee.status.replaceAll("_", " ")}
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Profile</h2>
        {canEdit ? (
          <form action={updateProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-navy">
              First name
              <input name="legalFirstName" defaultValue={employee.legalFirstName} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Last name
              <input name="legalLastName" defaultValue={employee.legalLastName} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Preferred name
              <input name="preferredName" defaultValue={employee.preferredName ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Email
              <input name="email" type="email" defaultValue={employee.email} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Phone
              <input name="phone" defaultValue={employee.phone ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Job title
              <input name="jobTitle" defaultValue={employee.jobTitle} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Department
              <input name="department" defaultValue={employee.department ?? ""} className={fieldClass} />
            </label>
            <label className="text-sm font-semibold text-navy">
              Classification
              <select name="classification" defaultValue={employee.classification} className={fieldClass}>
                <option value="W2_EMPLOYEE">W-2 employee</option>
                <option value="INDEPENDENT_CONTRACTOR">Independent contractor</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Status
              <select name="status" defaultValue={employee.status} className={fieldClass}>
                <option value="PENDING_ONBOARDING">Pending onboarding</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Hire date
              <input name="hireDate" type="date" defaultValue={isoDate(employee.hireDate)} className={fieldClass} />
            </label>
            <button className="h-fit self-end rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
              Save profile
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-muted">You can view this record but cannot edit it.</p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Onboarding</h2>
        <p className="mt-2 text-sm text-muted">
          Identity, tax, I-9, and SSN collection belong in this restricted workflow — not the public
          application.
        </p>
        <ul className="mt-4 grid gap-3">
          {employee.onboarding?.steps.map((step) => (
            <li key={step.id} className="rounded-xl border border-line px-3 py-3">
              {canEdit ? (
                <form action={updateStep} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <input type="hidden" name="stepId" value={step.id} />
                  <p className="text-sm font-medium text-navy">{step.key.replaceAll("_", " ")}</p>
                  <select name="status" defaultValue={step.status} className="rounded-lg border border-line px-3 py-2 text-sm">
                    <option value="NOT_STARTED">Not started</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="NOT_APPLICABLE">Not applicable</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                  <button className="rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white">
                    Update
                  </button>
                </form>
              ) : (
                <p className="text-sm">
                  {step.key.replaceAll("_", " ")} · {step.status.replaceAll("_", " ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Ohio new-hire reporting</h2>
        <p className="mt-2 text-sm text-muted">
          Tracking only. Information is not transmitted to Ohio unless an authorized integration is
          enabled.
        </p>
        {canEdit ? (
          <form action={updateHire} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-navy">
              Date hired
              <input
                name="dateHired"
                type="date"
                defaultValue={isoDate(employee.newHireReport?.dateHired)}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              First services date
              <input
                name="dateServicesFirstPerformed"
                type="date"
                defaultValue={isoDate(employee.newHireReport?.dateServicesFirstPerformed)}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Status
              <select
                name="status"
                defaultValue={employee.newHireReport?.status ?? "NOT_READY"}
                className={fieldClass}
              >
                <option value="NOT_READY">Not ready</option>
                <option value="READY">Ready</option>
                <option value="REPORTED">Reported</option>
                <option value="CONFIRMED">Confirmed</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Confirmation reference
              <input
                name="confirmationReference"
                defaultValue={employee.newHireReport?.confirmationReference ?? ""}
                className={fieldClass}
              />
            </label>
            <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
              Save reporting status
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm">Status: {employee.newHireReport?.status ?? "NOT READY"}</p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Training / tracking</h2>
        {employee.trainings.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No training records.</p>
        ) : (
          <ul className="mt-2 text-sm">
            {employee.trainings.map((training) => (
              <li key={training.id}>
                {training.title} · expires {training.expiresAt?.toLocaleDateString() ?? "n/a"}
              </li>
            ))}
          </ul>
        )}
        {canEdit ? (
          <form action={addTraining} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="title" required placeholder="Training title" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <input name="requirementKey" placeholder="Requirement key" className="rounded-lg border border-line px-3 py-2 text-sm" />
            <label className="text-sm">
              Completed
              <input name="completedAt" type="date" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              Expires
              <input name="expiresAt" type="date" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
            </label>
            <button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:w-fit">
              Add training
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Compliance records</h2>
        {employee.complianceRecords.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No compliance records yet. Add them from{" "}
            <Link href="/dashboard/compliance" className="font-semibold text-medical hover:underline">
              Compliance tracking
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-2 text-sm">
            {employee.complianceRecords.map((record) => (
              <li key={record.id}>
                {record.requirement.name} · {record.status.replaceAll("_", " ")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
