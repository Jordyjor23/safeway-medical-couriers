"use client";

import { useActionState, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Route,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  saveOperatingModel,
  type OperatingModelActionState,
} from "@/app/(portal)/dashboard/contracts/operating-model/actions";
import {
  calculateOperatingModel,
  modelHealth,
  type OperatingModelInput,
} from "@/lib/operating-model";

type ContractOption = {
  id: string;
  label: string;
};

const initialActionState: OperatingModelActionState = { status: "idle" };
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

type NumericKey = Exclude<{
  [K in keyof OperatingModelInput]: OperatingModelInput[K] extends number ? K : never;
}[keyof OperatingModelInput], undefined>;

function NumericField({
  label,
  name,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
  help,
  error,
}: {
  label: string;
  name: NumericKey;
  value: number;
  onChange: (name: NumericKey, value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  help?: string;
  error?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-navy">
      {label}
      <span className="mt-1.5 flex overflow-hidden rounded-lg border border-line bg-white focus-within:border-medical focus-within:ring-2 focus-within:ring-medical/15">
        {prefix ? <span className="flex items-center bg-ice px-3 text-muted">{prefix}</span> : null}
        <input
          name={name}
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(name, Number(event.target.value))}
          className="min-w-0 flex-1 px-3 py-2.5 font-normal text-ink outline-none"
          aria-invalid={Boolean(error)}
        />
        {suffix ? <span className="flex items-center bg-ice px-3 text-muted">{suffix}</span> : null}
      </span>
      {error ? <span className="mt-1 block text-xs font-normal text-red-700">{error}</span> : null}
      {!error && help ? <span className="mt-1 block text-xs font-normal text-muted">{help}</span> : null}
    </label>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Calculator;
  tone?: "default" | "positive" | "negative";
}) {
  const valueTone =
    tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-navy";
  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted">{label}</p>
          <p className={`mt-2 text-2xl font-semibold ${valueTone}`}>{value}</p>
        </div>
        <span className="rounded-xl bg-ice p-2.5 text-medical">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">{detail}</p>
    </div>
  );
}

function ExpenseBar({ label, amount, revenue, color }: { label: string; amount: number; revenue: number; color: string }) {
  const percent = revenue > 0 ? (amount / revenue) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-navy">{label}</span>
        <span className="text-muted">
          {currency.format(amount)} · {percent.toFixed(1)}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ice">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

export function OperatingModelPlanner({
  initialModel,
  contracts,
}: {
  initialModel: OperatingModelInput;
  contracts: ContractOption[];
}) {
  const [values, setValues] = useState(initialModel);
  const [actionState, formAction, pending] = useActionState(saveOperatingModel, initialActionState);
  const metrics = useMemo(() => calculateOperatingModel(values), [values]);
  const health = modelHealth(metrics.operatingMarginPercent, metrics.financingGap);
  const fieldError = (name: keyof OperatingModelInput) => actionState.fieldErrors?.[name]?.[0];

  const setNumericValue = (name: NumericKey, next: number) => {
    setValues((current) => ({ ...current, [name]: Number.isFinite(next) ? next : 0 }));
  };

  const healthClass =
    health.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : health.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <form action={formAction} className="space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <section className="overflow-hidden rounded-3xl bg-navy text-white shadow-lg">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${healthClass}`}>{health.label}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">Live planning model</span>
            </div>
            <input
              name="name"
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              className="mt-4 w-full border-0 bg-transparent p-0 text-2xl font-semibold text-white outline-none placeholder:text-white/40 sm:text-3xl"
              aria-label="Operating model name"
            />
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Change an assumption and the staffing, burn rate, cash requirement, and margin update immediately.
              Saved values remain internal to authorized finance users.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/8 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/55">Annual value</p>
              <p className="mt-1 text-xl font-semibold">{currency.format(values.annualRevenue)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/55">Projected profit</p>
              <p className={`mt-1 text-xl font-semibold ${metrics.annualOperatingProfit < 0 ? "text-red-300" : "text-emerald-300"}`}>
                {currency.format(metrics.annualOperatingProfit)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/55">Operating margin</p>
              <p className="mt-1 text-xl font-semibold">{metrics.operatingMarginPercent.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/55">Launch cash</p>
              <p className="mt-1 text-xl font-semibold">{currency.format(metrics.launchCashRequired)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Monthly revenue" value={currency.format(metrics.monthlyRevenue)} detail={`${values.contractMonths}-month contract planning horizon`} icon={CircleDollarSign} />
        <MetricCard label="Monthly burn" value={currency.format(metrics.monthlyBurn)} detail="Loaded labor, fleet, and operating overhead" icon={Banknote} />
        <MetricCard
          label="Driver staffing"
          value={`${metrics.estimatedDriverHeadcount} people`}
          detail={`${number.format(metrics.estimatedDriverFte)} FTE · ${number.format(metrics.annualDriverHours)} paid hours with relief`}
          icon={Users}
        />
        <MetricCard
          label="Financing gap"
          value={currency.format(metrics.financingGap)}
          detail={`${values.accountsReceivableDays}-day receivable lag plus ${values.cashReserveMonths} reserve month(s)`}
          icon={ShieldCheck}
          tone={metrics.financingGap > 0 ? "negative" : "positive"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-ice p-2 text-medical"><Route className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <h2 className="text-lg font-semibold text-navy">Contract and route assumptions</h2>
                <p className="text-sm text-muted">The revenue and service footprint Safeway is pricing.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-navy sm:col-span-2">
                Linked portal contract
                <select
                  name="contractId"
                  value={values.contractId ?? ""}
                  onChange={(event) => setValues((current) => ({ ...current, contractId: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 font-normal text-ink"
                >
                  <option value="">Planning opportunity — not yet linked</option>
                  {contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.label}</option>)}
                </select>
              </label>
              <NumericField label="Annual contract value" name="annualRevenue" value={values.annualRevenue} onChange={setNumericValue} prefix="$" step={1000} error={fieldError("annualRevenue")} />
              <NumericField label="Contract term" name="contractMonths" value={values.contractMonths} onChange={setNumericValue} suffix="months" error={fieldError("contractMonths")} />
              <NumericField label="Daily routes" name="routeCount" value={values.routeCount} onChange={setNumericValue} suffix="routes" error={fieldError("routeCount")} />
              <NumericField label="Operating days" name="operatingDaysPerWeek" value={values.operatingDaysPerWeek} onChange={setNumericValue} suffix="days/wk" step={0.5} error={fieldError("operatingDaysPerWeek")} />
              <NumericField label="Average route length" name="averageRouteHoursPerDay" value={values.averageRouteHoursPerDay} onChange={setNumericValue} suffix="hours" step={0.25} error={fieldError("averageRouteHoursPerDay")} />
              <NumericField label="Relief / absence coverage" name="reliefCoveragePercent" value={values.reliefCoveragePercent} onChange={setNumericValue} suffix="%" step={0.5} help="Adds coverage for PTO, call-offs, and schedule gaps." error={fieldError("reliefCoveragePercent")} />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-ice p-2 text-medical"><Users className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <h2 className="text-lg font-semibold text-navy">Staffing and loaded payroll</h2>
                <p className="text-sm text-muted">Wages plus employer taxes, workers comp, and benefits burden.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <NumericField label="Driver hourly wage" name="driverHourlyRate" value={values.driverHourlyRate} onChange={setNumericValue} prefix="$" suffix="/hr" step={0.25} error={fieldError("driverHourlyRate")} />
              <NumericField label="Payroll burden" name="payrollBurdenPercent" value={values.payrollBurdenPercent} onChange={setNumericValue} suffix="%" step={0.5} error={fieldError("payrollBurdenPercent")} />
              <NumericField label="Operations managers" name="operationsManagerCount" value={values.operationsManagerCount} onChange={setNumericValue} error={fieldError("operationsManagerCount")} />
              <NumericField label="Manager annual salary" name="operationsManagerAnnualSalary" value={values.operationsManagerAnnualSalary} onChange={setNumericValue} prefix="$" step={1000} error={fieldError("operationsManagerAnnualSalary")} />
              <NumericField label="Dispatch / admin staff" name="dispatcherCount" value={values.dispatcherCount} onChange={setNumericValue} error={fieldError("dispatcherCount")} />
              <NumericField label="Dispatch annual salary" name="dispatcherAnnualSalary" value={values.dispatcherAnnualSalary} onChange={setNumericValue} prefix="$" step={1000} error={fieldError("dispatcherAnnualSalary")} />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-ice p-2 text-medical"><CarFront className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <h2 className="text-lg font-semibold text-navy">Fleet and route support</h2>
                <p className="text-sm text-muted">Use lease cost or expected monthly reimbursement in the vehicle field.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <NumericField label="Active vehicles" name="activeVehicleCount" value={values.activeVehicleCount} onChange={setNumericValue} error={fieldError("activeVehicleCount")} />
              <NumericField label="Reserve vehicles" name="reserveVehicleCount" value={values.reserveVehicleCount} onChange={setNumericValue} error={fieldError("reserveVehicleCount")} />
              <NumericField label="Vehicle / reimbursement" name="vehicleMonthlyCost" value={values.vehicleMonthlyCost} onChange={setNumericValue} prefix="$" suffix="/mo each" step={25} error={fieldError("vehicleMonthlyCost")} />
              <NumericField label="Fuel" name="fuelMonthlyPerVehicle" value={values.fuelMonthlyPerVehicle} onChange={setNumericValue} prefix="$" suffix="/mo each" step={25} error={fieldError("fuelMonthlyPerVehicle")} />
              <NumericField label="Commercial insurance" name="insuranceMonthlyPerVehicle" value={values.insuranceMonthlyPerVehicle} onChange={setNumericValue} prefix="$" suffix="/mo each" step={25} error={fieldError("insuranceMonthlyPerVehicle")} />
              <NumericField label="Maintenance / tires" name="maintenanceMonthlyPerVehicle" value={values.maintenanceMonthlyPerVehicle} onChange={setNumericValue} prefix="$" suffix="/mo each" step={25} error={fieldError("maintenanceMonthlyPerVehicle")} />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-ice p-2 text-medical"><Clock3 className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <h2 className="text-lg font-semibold text-navy">Overhead and working capital</h2>
                <p className="text-sm text-muted">What it costs to survive until the customer actually pays.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <NumericField label="Technology" name="technologyMonthly" value={values.technologyMonthly} onChange={setNumericValue} prefix="$" suffix="/mo" step={50} error={fieldError("technologyMonthly")} />
              <NumericField label="Compliance / training" name="complianceMonthly" value={values.complianceMonthly} onChange={setNumericValue} prefix="$" suffix="/mo" step={50} error={fieldError("complianceMonthly")} />
              <NumericField label="Office / admin" name="officeAdminMonthly" value={values.officeAdminMonthly} onChange={setNumericValue} prefix="$" suffix="/mo" step={50} error={fieldError("officeAdminMonthly")} />
              <NumericField label="Other contingency" name="otherMonthly" value={values.otherMonthly} onChange={setNumericValue} prefix="$" suffix="/mo" step={50} error={fieldError("otherMonthly")} />
              <NumericField label="One-time startup costs" name="startupOneTimeCosts" value={values.startupOneTimeCosts} onChange={setNumericValue} prefix="$" step={1000} error={fieldError("startupOneTimeCosts")} />
              <NumericField label="Customer payment lag" name="accountsReceivableDays" value={values.accountsReceivableDays} onChange={setNumericValue} suffix="days" error={fieldError("accountsReceivableDays")} />
              <NumericField label="Extra cash reserve" name="cashReserveMonths" value={values.cashReserveMonths} onChange={setNumericValue} suffix="months" step={0.25} error={fieldError("cashReserveMonths")} />
              <NumericField label="Capital already available" name="availableStartupCapital" value={values.availableStartupCapital} onChange={setNumericValue} prefix="$" step={1000} error={fieldError("availableStartupCapital")} />
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-navy">Annual operating statement</h2>
            <p className="mt-1 text-sm text-muted">Base case before taxes, debt service, and owner distributions.</p>
            <div className="mt-6 space-y-5">
              <ExpenseBar label="Loaded labor" amount={metrics.annualLabor} revenue={values.annualRevenue} color="bg-medical" />
              <ExpenseBar label="Fleet" amount={metrics.annualFleet} revenue={values.annualRevenue} color="bg-sky-500" />
              <ExpenseBar label="Operating overhead" amount={metrics.annualOverhead} revenue={values.annualRevenue} color="bg-violet-500" />
            </div>
            <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
              <div className="flex justify-between gap-4 py-3"><dt className="text-muted">Annual revenue</dt><dd className="font-semibold text-navy">{currency.format(values.annualRevenue)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-muted">Loaded driver labor</dt><dd>{currency.format(metrics.driverLoadedLabor)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-muted">Management + dispatch</dt><dd>{currency.format(metrics.managementLoadedLabor + metrics.dispatchLoadedLabor)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-muted">Fleet</dt><dd>{currency.format(metrics.annualFleet)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-muted">Overhead</dt><dd>{currency.format(metrics.annualOverhead)}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="font-semibold text-navy">Operating expense</dt><dd className="font-semibold text-navy">{currency.format(metrics.annualOperatingExpense)}</dd></div>
              <div className="flex justify-between gap-4 py-3 text-base"><dt className="font-semibold text-navy">Projected profit</dt><dd className={`font-semibold ${metrics.annualOperatingProfit < 0 ? "text-red-700" : "text-emerald-700"}`}>{currency.format(metrics.annualOperatingProfit)}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-navy">Bid guardrails</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl bg-ice p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Break-even annual value</p>
                <p className="mt-1 text-xl font-semibold text-navy">{currency.format(metrics.breakEvenAnnualRevenue)}</p>
              </div>
              <div className="rounded-xl bg-ice p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Revenue per route</p>
                <p className="mt-1 text-xl font-semibold text-navy">{currency.format(metrics.revenuePerRoute)}</p>
                <p className="mt-1 text-xs text-muted">Projected route profit: {currency.format(metrics.profitPerRoute)}</p>
              </div>
              <div className="rounded-xl bg-ice p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Minimum launch cash</p>
                <p className="mt-1 text-xl font-semibold text-navy">{currency.format(metrics.launchCashRequired)}</p>
                <p className="mt-1 text-xs text-muted">Startup costs + payment lag + selected reserve.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Before Safeway bids</h2>
                <p className="mt-1 text-sm leading-6">
                  Verify route hours, prevailing or wage-determination pay, overtime, deadhead mileage, insurance,
                  performance bonds, equipment, invoicing rules, and the customer&apos;s actual payment cycle.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
            <label className="block text-sm font-semibold text-navy">
              Planning notes
              <textarea
                name="notes"
                rows={5}
                value={values.notes ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 font-normal text-ink"
              />
            </label>
            {actionState.message ? (
              <div className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${actionState.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role="status">
                {actionState.status === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                {actionState.message}
              </div>
            ) : null}
            <button disabled={pending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white hover:bg-medical disabled:cursor-wait disabled:opacity-60">
              <Save className="h-4 w-4" aria-hidden="true" />
              {pending ? "Saving model…" : values.id ? "Save changes" : "Save $1.1M model"}
            </button>
          </section>
        </div>
      </div>
    </form>
  );
}
