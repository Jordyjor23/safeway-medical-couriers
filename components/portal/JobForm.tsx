import type { CareerCategory, JobOpening } from "@prisma/client";
import { createJob, updateJob } from "@/app/(portal)/dashboard/jobs/actions";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 focus:border-medical focus:ring-2";

export function JobForm({
  job,
  categories,
}: {
  job?: JobOpening;
  categories: CareerCategory[];
}) {
  const action = job
    ? updateJob.bind(null, job.id)
    : createJob;

  return (
    <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Position title
        <input name="title" required defaultValue={job?.title} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy">
        Department
        <input name="department" required defaultValue={job?.department} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy">
        Category
        <select name="categoryId" defaultValue={job?.categoryId ?? ""} className={fieldClass}>
          <option value="">None</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Employment type
        <select name="employmentType" defaultValue={job?.employmentType ?? "FULL_TIME"} className={fieldClass}>
          <option value="FULL_TIME">Full-time</option>
          <option value="PART_TIME">Part-time</option>
          <option value="TEMPORARY">Temporary</option>
          <option value="SEASONAL">Seasonal</option>
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Worker classification
        <select name="workerClassification" defaultValue={job?.workerClassification ?? "EMPLOYEE"} className={fieldClass}>
          <option value="EMPLOYEE">Employee</option>
          <option value="INDEPENDENT_CONTRACTOR">Independent contractor</option>
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Location
        <input name="location" required defaultValue={job?.location} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy">
        Work arrangement
        <select name="workArrangement" defaultValue={job?.workArrangement ?? "ONSITE"} className={fieldClass}>
          <option value="ONSITE">On-site</option>
          <option value="HYBRID">Hybrid</option>
          <option value="REMOTE">Remote</option>
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Pay type
        <select name="payType" defaultValue={job?.payType ?? "HOURLY"} className={fieldClass}>
          <option value="HOURLY">Hourly</option>
          <option value="SALARY">Salary</option>
          <option value="ROUTE_BASED">Route-based</option>
          <option value="COMMISSION">Commission</option>
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Compensation min
        <input name="compensationMin" type="number" step="0.01" defaultValue={job?.compensationMin?.toString() ?? ""} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy">
        Compensation max
        <input name="compensationMax" type="number" step="0.01" defaultValue={job?.compensationMax?.toString() ?? ""} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Compensation notes
        <textarea name="compensationNotes" rows={2} defaultValue={job?.compensationNotes ?? ""} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Job description
        <textarea name="description" required rows={5} defaultValue={job?.description} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Essential duties
        <textarea name="essentialDuties" required rows={5} defaultValue={job?.essentialDuties} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Minimum qualifications
        <textarea name="minimumQualifications" required rows={4} defaultValue={job?.minimumQualifications} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Preferred qualifications
        <textarea name="preferredQualifications" rows={3} defaultValue={job?.preferredQualifications ?? ""} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Physical / job requirements
        <textarea name="physicalRequirements" rows={3} defaultValue={job?.physicalRequirements ?? ""} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Schedule
        <textarea name="schedule" rows={2} defaultValue={job?.schedule ?? ""} className={fieldClass} />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-navy">
        <input type="checkbox" name="requiresDriversLicense" defaultChecked={job?.requiresDriversLicense} />
        Requires driver’s license
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-navy">
        <input type="checkbox" name="backgroundCheckRequired" defaultChecked={job?.backgroundCheckRequired ?? true} />
        Background check may be required after disclosure/authorization
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-navy">
        <input type="checkbox" name="mvrRequired" defaultChecked={job?.mvrRequired} />
        Motor vehicle record may be required
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Vehicle requirements
        <textarea name="vehicleRequirements" rows={2} defaultValue={job?.vehicleRequirements ?? ""} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Required certifications
        <textarea name="requiredCertifications" rows={2} defaultValue={job?.requiredCertifications ?? ""} className={fieldClass} />
      </label>
      <button type="submit" className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-medical sm:col-span-2 sm:w-fit">
        {job ? "Save job" : "Create draft"}
      </button>
    </form>
  );
}
