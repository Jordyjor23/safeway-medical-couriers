import { z } from "zod";

const nonNegative = z.coerce.number().finite().min(0);
const positive = z.coerce.number().finite().gt(0);
const count = z.coerce.number().int().min(0);

export const operatingModelSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(3).max(100),
  contractId: z.string().uuid().optional().or(z.literal("")),
  annualRevenue: positive.max(100_000_000),
  contractMonths: z.coerce.number().int().min(1).max(120),
  routeCount: z.coerce.number().int().min(1).max(500),
  operatingDaysPerWeek: positive.max(7),
  averageRouteHoursPerDay: positive.max(24),
  reliefCoveragePercent: nonNegative.max(200),
  driverHourlyRate: positive.max(500),
  payrollBurdenPercent: nonNegative.max(200),
  operationsManagerCount: count.max(100),
  operationsManagerAnnualSalary: nonNegative.max(1_000_000),
  dispatcherCount: count.max(500),
  dispatcherAnnualSalary: nonNegative.max(1_000_000),
  activeVehicleCount: count.max(1_000),
  reserveVehicleCount: count.max(1_000),
  vehicleMonthlyCost: nonNegative.max(100_000),
  fuelMonthlyPerVehicle: nonNegative.max(100_000),
  insuranceMonthlyPerVehicle: nonNegative.max(100_000),
  maintenanceMonthlyPerVehicle: nonNegative.max(100_000),
  technologyMonthly: nonNegative.max(1_000_000),
  complianceMonthly: nonNegative.max(1_000_000),
  officeAdminMonthly: nonNegative.max(1_000_000),
  otherMonthly: nonNegative.max(1_000_000),
  startupOneTimeCosts: nonNegative.max(100_000_000),
  accountsReceivableDays: z.coerce.number().int().min(0).max(365),
  cashReserveMonths: nonNegative.max(24),
  availableStartupCapital: nonNegative.max(100_000_000),
  notes: z.string().trim().max(5_000).optional(),
});

export type OperatingModelInput = z.infer<typeof operatingModelSchema>;

export const DEFAULT_OPERATING_MODEL: OperatingModelInput = {
  name: "$1.1M / 12-route base case",
  contractId: "",
  annualRevenue: 1_100_000,
  contractMonths: 12,
  routeCount: 12,
  operatingDaysPerWeek: 5,
  averageRouteHoursPerDay: 5,
  reliefCoveragePercent: 15,
  driverHourlyRate: 21.5,
  payrollBurdenPercent: 18,
  operationsManagerCount: 1,
  operationsManagerAnnualSalary: 62_000,
  dispatcherCount: 1,
  dispatcherAnnualSalary: 48_000,
  activeVehicleCount: 12,
  reserveVehicleCount: 2,
  vehicleMonthlyCost: 450,
  fuelMonthlyPerVehicle: 425,
  insuranceMonthlyPerVehicle: 240,
  maintenanceMonthlyPerVehicle: 125,
  technologyMonthly: 1_200,
  complianceMonthly: 1_500,
  officeAdminMonthly: 3_500,
  otherMonthly: 1_250,
  startupOneTimeCosts: 45_000,
  accountsReceivableDays: 30,
  cashReserveMonths: 1,
  availableStartupCapital: 0,
  notes:
    "Base planning case only. Replace every assumption with the solicitation, wage determination, insurance quote, route schedule, and payment terms before submitting a bid.",
};

export function calculateOperatingModel(input: OperatingModelInput) {
  const baseDriverHoursAnnual =
    input.routeCount * input.operatingDaysPerWeek * input.averageRouteHoursPerDay * 52;
  const annualDriverHours = baseDriverHoursAnnual * (1 + input.reliefCoveragePercent / 100);
  const estimatedDriverFte = annualDriverHours / 2_080;
  const estimatedDriverHeadcount = Math.ceil(input.routeCount * (1 + input.reliefCoveragePercent / 100));
  const burdenMultiplier = 1 + input.payrollBurdenPercent / 100;
  const driverWages = annualDriverHours * input.driverHourlyRate;
  const driverLoadedLabor = driverWages * burdenMultiplier;
  const managementLoadedLabor =
    input.operationsManagerCount * input.operationsManagerAnnualSalary * burdenMultiplier;
  const dispatchLoadedLabor = input.dispatcherCount * input.dispatcherAnnualSalary * burdenMultiplier;
  const annualLabor = driverLoadedLabor + managementLoadedLabor + dispatchLoadedLabor;

  const totalVehicles = input.activeVehicleCount + input.reserveVehicleCount;
  const monthlyCostPerVehicle =
    input.vehicleMonthlyCost +
    input.fuelMonthlyPerVehicle +
    input.insuranceMonthlyPerVehicle +
    input.maintenanceMonthlyPerVehicle;
  const annualFleet = totalVehicles * monthlyCostPerVehicle * 12;
  const monthlyOverhead =
    input.technologyMonthly +
    input.complianceMonthly +
    input.officeAdminMonthly +
    input.otherMonthly;
  const annualOverhead = monthlyOverhead * 12;
  const annualOperatingExpense = annualLabor + annualFleet + annualOverhead;
  const annualOperatingProfit = input.annualRevenue - annualOperatingExpense;
  const operatingMarginPercent = (annualOperatingProfit / input.annualRevenue) * 100;
  const monthlyRevenue = input.annualRevenue / 12;
  const monthlyBurn = annualOperatingExpense / 12;
  const collectionLagMonths = input.accountsReceivableDays / 30;
  const launchCashRequired =
    input.startupOneTimeCosts + monthlyBurn * (collectionLagMonths + input.cashReserveMonths);
  const financingGap = Math.max(0, launchCashRequired - input.availableStartupCapital);

  return {
    baseDriverHoursAnnual,
    annualDriverHours,
    estimatedDriverFte,
    estimatedDriverHeadcount,
    driverWages,
    driverLoadedLabor,
    managementLoadedLabor,
    dispatchLoadedLabor,
    annualLabor,
    totalVehicles,
    monthlyCostPerVehicle,
    annualFleet,
    monthlyOverhead,
    annualOverhead,
    annualOperatingExpense,
    annualOperatingProfit,
    operatingMarginPercent,
    monthlyRevenue,
    monthlyBurn,
    launchCashRequired,
    financingGap,
    breakEvenAnnualRevenue: annualOperatingExpense,
    revenuePerRoute: input.annualRevenue / input.routeCount,
    expensePerRoute: annualOperatingExpense / input.routeCount,
    profitPerRoute: annualOperatingProfit / input.routeCount,
    laborPercentOfRevenue: (annualLabor / input.annualRevenue) * 100,
    fleetPercentOfRevenue: (annualFleet / input.annualRevenue) * 100,
    overheadPercentOfRevenue: (annualOverhead / input.annualRevenue) * 100,
  };
}

export function modelHealth(marginPercent: number, financingGap: number) {
  if (marginPercent < 0) return { label: "No-go", tone: "danger" as const };
  if (marginPercent < 12 || financingGap > 0) return { label: "Needs work", tone: "warning" as const };
  return { label: "Bid-capable", tone: "success" as const };
}
