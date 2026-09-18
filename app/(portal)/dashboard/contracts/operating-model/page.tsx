import type { Metadata } from "next";
import Link from "next/link";
import { OperatingModelPlanner } from "@/components/portal/OperatingModelPlanner";
import { prisma } from "@/lib/db";
import { DEFAULT_OPERATING_MODEL, type OperatingModelInput } from "@/lib/operating-model";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Contract operating model" };

function serializeModel(model: Awaited<ReturnType<typeof getModel>>, defaultContractId = ""): OperatingModelInput {
  if (!model) return { ...DEFAULT_OPERATING_MODEL, contractId: defaultContractId };
  return {
    id: model.id,
    name: model.name,
    contractId: model.contractId ?? "",
    annualRevenue: Number(model.annualRevenue),
    contractMonths: model.contractMonths,
    routeCount: model.routeCount,
    operatingDaysPerWeek: Number(model.operatingDaysPerWeek),
    averageRouteHoursPerDay: Number(model.averageRouteHoursPerDay),
    reliefCoveragePercent: Number(model.reliefCoveragePercent),
    driverHourlyRate: Number(model.driverHourlyRate),
    payrollBurdenPercent: Number(model.payrollBurdenPercent),
    operationsManagerCount: model.operationsManagerCount,
    operationsManagerAnnualSalary: Number(model.operationsManagerAnnualSalary),
    dispatcherCount: model.dispatcherCount,
    dispatcherAnnualSalary: Number(model.dispatcherAnnualSalary),
    activeVehicleCount: model.activeVehicleCount,
    reserveVehicleCount: model.reserveVehicleCount,
    vehicleMonthlyCost: Number(model.vehicleMonthlyCost),
    fuelMonthlyPerVehicle: Number(model.fuelMonthlyPerVehicle),
    insuranceMonthlyPerVehicle: Number(model.insuranceMonthlyPerVehicle),
    maintenanceMonthlyPerVehicle: Number(model.maintenanceMonthlyPerVehicle),
    technologyMonthly: Number(model.technologyMonthly),
    complianceMonthly: Number(model.complianceMonthly),
    officeAdminMonthly: Number(model.officeAdminMonthly),
    otherMonthly: Number(model.otherMonthly),
    startupOneTimeCosts: Number(model.startupOneTimeCosts),
    accountsReceivableDays: model.accountsReceivableDays,
    cashReserveMonths: Number(model.cashReserveMonths),
    availableStartupCapital: Number(model.availableStartupCapital),
    notes: model.notes ?? "",
  };
}

async function getModel(id?: string) {
  if (id) return prisma.contractOperatingModel.findUnique({ where: { id } });
  return prisma.contractOperatingModel.findFirst({ orderBy: { updatedAt: "desc" } });
}

export default async function ContractOperatingModelPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string; new?: string; contract?: string }>;
}) {
  await requirePermission("finance.view");
  const query = await searchParams;
  const [selectedModel, models, contracts] = await Promise.all([
    query.new === "1" ? Promise.resolve(null) : getModel(query.model),
    prisma.contractOperatingModel.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, annualRevenue: true, updatedAt: true },
    }),
    prisma.contract.findMany({
      orderBy: { updatedAt: "desc" },
      include: { customer: { select: { legalName: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/contracts" className="text-sm font-semibold text-medical hover:underline">← Contracts</Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-medical">Contract economics</p>
          <h1 className="mt-2 text-3xl font-semibold text-navy">$1.1M operating model</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Pressure-test whether the opportunity can carry its routes, people, fleet, overhead, and customer payment lag before Safeway commits.
          </p>
        </div>
        <Link href="/dashboard/contracts/operating-model?new=1" className="rounded-full border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-navy hover:text-white">
          New scenario
        </Link>
      </div>

      {models.length > 0 ? (
        <nav className="flex gap-3 overflow-x-auto pb-1" aria-label="Saved operating models">
          {models.map((model) => (
            <Link
              key={model.id}
              href={`/dashboard/contracts/operating-model?model=${model.id}`}
              className={`min-w-56 rounded-xl border p-3 text-sm ${selectedModel?.id === model.id ? "border-medical bg-sky-50" : "border-line bg-paper hover:border-medical/50"}`}
            >
              <span className="block font-semibold text-navy">{model.name}</span>
              <span className="mt-1 block text-xs text-muted">
                {Number(model.annualRevenue).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} · updated {model.updatedAt.toLocaleDateString()}
              </span>
            </Link>
          ))}
        </nav>
      ) : null}

      <OperatingModelPlanner
        key={selectedModel?.id ?? "new"}
        initialModel={serializeModel(selectedModel, query.contract)}
        contracts={contracts.map((contract) => ({
          id: contract.id,
          label: `${contract.contractNumber} · ${contract.customer.legalName}`,
        }))}
      />
    </div>
  );
}
