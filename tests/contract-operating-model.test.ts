import { describe, expect, it } from "vitest";
import {
  calculateOperatingModel,
  DEFAULT_OPERATING_MODEL,
  modelHealth,
  operatingModelSchema,
} from "@/lib/operating-model";

describe("contract operating model", () => {
  it("calculates the $1.1M base case from operational drivers", () => {
    const result = calculateOperatingModel(DEFAULT_OPERATING_MODEL);

    expect(result.annualDriverHours).toBe(17_940);
    expect(result.estimatedDriverFte).toBeCloseTo(8.625, 3);
    expect(result.estimatedDriverHeadcount).toBe(14);
    expect(result.totalVehicles).toBe(14);
    expect(result.annualLabor).toBeCloseTo(584_937.8, 1);
    expect(result.annualFleet).toBe(208_320);
    expect(result.annualOverhead).toBe(89_400);
    expect(result.annualOperatingExpense).toBeCloseTo(882_657.8, 1);
    expect(result.annualOperatingProfit).toBeCloseTo(217_342.2, 1);
    expect(result.operatingMarginPercent).toBeCloseTo(19.76, 2);
  });

  it("includes payment lag and reserve months in launch cash", () => {
    const result = calculateOperatingModel(DEFAULT_OPERATING_MODEL);

    expect(result.monthlyBurn).toBeCloseTo(73_554.82, 2);
    expect(result.launchCashRequired).toBeCloseTo(192_109.63, 2);
    expect(result.financingGap).toBeCloseTo(result.launchCashRequired, 2);
  });

  it("reduces the financing gap by capital already available", () => {
    const result = calculateOperatingModel({
      ...DEFAULT_OPERATING_MODEL,
      availableStartupCapital: 200_000,
    });

    expect(result.financingGap).toBe(0);
  });

  it("flags losing work as a no-go", () => {
    const result = calculateOperatingModel({
      ...DEFAULT_OPERATING_MODEL,
      annualRevenue: 500_000,
    });

    expect(result.annualOperatingProfit).toBeLessThan(0);
    expect(modelHealth(result.operatingMarginPercent, result.financingGap).label).toBe("No-go");
  });

  it("requires positive revenue, routes, days, hours, and driver pay", () => {
    const invalid = operatingModelSchema.safeParse({
      ...DEFAULT_OPERATING_MODEL,
      annualRevenue: 0,
      routeCount: 0,
      operatingDaysPerWeek: 0,
      averageRouteHoursPerDay: 0,
      driverHourlyRate: 0,
    });

    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      const fields = invalid.error.flatten().fieldErrors;
      expect(fields.annualRevenue).toBeDefined();
      expect(fields.routeCount).toBeDefined();
      expect(fields.operatingDaysPerWeek).toBeDefined();
      expect(fields.averageRouteHoursPerDay).toBeDefined();
      expect(fields.driverHourlyRate).toBeDefined();
    }
  });

  it("accepts valid form-style string values", () => {
    const valid = operatingModelSchema.safeParse({
      ...DEFAULT_OPERATING_MODEL,
      annualRevenue: "1100000",
      routeCount: "12",
      accountsReceivableDays: "45",
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.annualRevenue).toBe(1_100_000);
      expect(valid.data.routeCount).toBe(12);
      expect(valid.data.accountsReceivableDays).toBe(45);
    }
  });
});
