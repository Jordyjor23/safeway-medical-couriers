import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { evaluateEmployeeRouteQualification } from "@/lib/route-eligibility";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Route Qualification Matrix" };

export default async function RouteQualificationMatrixPage() {
  await requirePermission("employees.view");

  const [employees, routes] = await Promise.all([
    prisma.employee.findMany({
      where: {
        isDriver: true,
        status: { in: ["ACTIVE", "PENDING_ONBOARDING"] },
      },
      include: {
        trainings: true,
        certifications: true,
        complianceRecords: { include: { requirement: true } },
        documents: {
          include: {
            document: {
              select: {
                name: true,
                documentType: true,
                verificationStatus: true,
                lifecycleStatus: true,
                expirationDate: true,
                archivedAt: true,
              },
            },
          },
        },
        vehicle: true,
      },
      orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
    }),
    prisma.routeTemplate.findMany({
      where: {
        scope: "CONTRACT",
        active: true,
        contract: { status: { in: ["ACTIVE", "EXPIRING", "RENEWED"] } },
      },
      include: {
        contract: { include: { customer: true } },
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  return (
    <div>
      <Link href="/dashboard/hr" className="text-sm font-semibold text-medical hover:underline">
        ← HR & Onboarding
      </Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-medical">
        Credential intelligence
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-navy">Route qualification matrix</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Eligibility is computed from verified credentials, training, compliance records, certifications,
        worker status, and vehicle requirements. PTO, call-offs, and overlapping work are checked separately
        at dispatch time.
      </p>

      <div className="mt-6 grid gap-5">
        {employees.map((employee) => {
          const evaluated = routes.map((route) => ({
            route,
            result: evaluateEmployeeRouteQualification(employee, route),
          }));
          const eligible = evaluated.filter((item) => item.result.eligible);
          const blocked = evaluated.filter((item) => !item.result.eligible);

          return (
            <section key={employee.id} className="rounded-2xl border border-line bg-paper p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={"/dashboard/employees/" + employee.id}
                    className="text-lg font-semibold text-navy hover:text-medical"
                  >
                    {employee.legalFirstName} {employee.legalLastName}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {employee.employeeNumber} · {employee.classification.replaceAll("_", " ")} ·{" "}
                    {employee.status.replaceAll("_", " ")}
                  </p>
                </div>
                <span className="rounded-full bg-ice px-3 py-1.5 text-xs font-semibold text-navy">
                  {eligible.length} / {routes.length} routes credential-eligible
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <h2 className="text-sm font-semibold text-emerald-800">Eligible routes</h2>
                  {eligible.length ? (
                    <ul className="mt-2 grid gap-2">
                      {eligible.map(({ route, result }) => (
                        <li key={route.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                          <p className="font-semibold text-navy">{route.name}</p>
                          <p className="text-xs text-muted">
                            {route.contract?.contractNumber} · {route.contract?.customer.legalName}
                          </p>
                          {result.evidence.length ? (
                            <p className="mt-1 text-xs text-emerald-800">
                              Matched: {result.evidence.join(", ")}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted">No active contract routes currently match.</p>
                  )}
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-amber-800">Not currently eligible</h2>
                  {blocked.length ? (
                    <ul className="mt-2 grid gap-2">
                      {blocked.map(({ route, result }) => (
                        <li key={route.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="font-semibold text-navy">{route.name}</p>
                          <p className="text-xs text-muted">
                            {route.contract?.contractNumber} · {route.contract?.customer.legalName}
                          </p>
                          <p className="mt-1 text-xs text-amber-900">
                            Needs: {result.reasons.join(" · ")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted">Qualified for every active contract route.</p>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
