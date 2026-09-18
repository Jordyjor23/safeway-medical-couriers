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
        active: true,
        OR: [
          { scope: "GENERIC" },
          {
            scope: "CONTRACT",
            contract: { status: { in: ["ACTIVE", "EXPIRING", "RENEWED"] } },
          },
        ],
      },
      include: {
        contract: { include: { customer: true } },
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  const genericRoutes = routes.filter((route) => route.scope === "GENERIC");
  const contractRoutes = routes.filter((route) => route.scope === "CONTRACT");

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

      {employees.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-paper p-6 text-sm text-muted">
          No active or onboarding employee records are available to evaluate yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          {employees.map((employee) => {
            const genericEvaluated = genericRoutes.map((route) => ({
              route,
              result: evaluateEmployeeRouteQualification(employee, route),
            }));
            const contractEvaluated = contractRoutes.map((route) => ({
              route,
              result: evaluateEmployeeRouteQualification(employee, route),
            }));
            const genericEligible = genericEvaluated.filter((item) => item.result.eligible);
            const contractEligible = contractEvaluated.filter((item) => item.result.eligible);

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
                    <p className="mt-1 text-xs font-semibold text-medical">
                      {employee.isDriver ? "Courier / driver enabled" : "Not marked as courier / driver"}
                    </p>
                  </div>
                  <span className="rounded-full bg-ice px-3 py-1.5 text-xs font-semibold text-navy">
                    {genericEligible.length} / {genericRoutes.length} route types qualified
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <h2 className="text-sm font-semibold text-navy">Route-type qualification</h2>
                    <p className="mt-1 text-xs text-muted">
                      These are Safeway’s reusable route templates and can be evaluated before a customer contract exists.
                    </p>
                    {genericEvaluated.length ? (
                      <ul className="mt-3 grid gap-2">
                        {genericEvaluated.map(({ route, result }) => (
                          <li
                            key={route.id}
                            className={`rounded-xl border p-3 ${
                              result.eligible
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-amber-200 bg-amber-50"
                            }`}
                          >
                            <p className="font-semibold text-navy">{route.name}</p>
                            <p className={`mt-1 text-xs ${result.eligible ? "text-emerald-800" : "text-amber-900"}`}>
                              {result.eligible
                                ? `Qualified${result.evidence.length ? ` · Matched: ${result.evidence.join(", ")}` : ""}`
                                : `Needs: ${result.reasons.join(" · ")}`}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-muted">No generic route templates are configured.</p>
                    )}
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-navy">Active contract route eligibility</h2>
                    <p className="mt-1 text-xs text-muted">
                      Contract routes appear here after a contract-specific route is created and the contract is active.
                    </p>
                    {contractEvaluated.length ? (
                      <ul className="mt-3 grid gap-2">
                        {contractEvaluated.map(({ route, result }) => (
                          <li
                            key={route.id}
                            className={`rounded-xl border p-3 ${
                              result.eligible
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-amber-200 bg-amber-50"
                            }`}
                          >
                            <p className="font-semibold text-navy">{route.name}</p>
                            <p className="text-xs text-muted">
                              {route.contract?.contractNumber} · {route.contract?.customer.legalName}
                            </p>
                            <p className={`mt-1 text-xs ${result.eligible ? "text-emerald-800" : "text-amber-900"}`}>
                              {result.eligible ? "Credential eligible" : `Needs: ${result.reasons.join(" · ")}`}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-line bg-ice p-4 text-sm text-muted">
                        No active contract-specific routes exist yet. This is expected until you create a contract route from one of the generic templates.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-line pt-4">
                  <Link
                    href={"/dashboard/employees/" + employee.id}
                    className="text-sm font-semibold text-medical hover:underline"
                  >
                    Edit employee credentials / courier status →
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
