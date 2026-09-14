import type { CareerCategory, ComplianceRequirement, JobOpening, JobQuestion } from "@prisma/client";
import { createJob, updateJob } from "@/app/(portal)/dashboard/jobs/actions";
import {
  JOB_DEPARTMENTS,
  JOB_EMPLOYMENT_TYPES,
  JOB_PAY_TYPES,
  JOB_SHIFTS,
  JOB_STATUSES,
  JOB_WORK_ARRANGEMENTS,
  JOB_WORKER_CLASSIFICATIONS,
} from "@/lib/jobs/options";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 focus:border-medical focus:ring-2";

export function JobForm({
  job,
  categories,
  requirements = [],
  selectedRequirementIds = [],
  questions = [],
}: {
  job?: JobOpening;
  categories: CareerCategory[];
  requirements?: Pick<ComplianceRequirement, "id" | "key" | "name">[];
  selectedRequirementIds?: string[];
  questions?: Pick<JobQuestion, "prompt">[];
}) {
  const action = job ? updateJob.bind(null, job.id) : createJob;
  const selectedShift = JOB_SHIFTS.find((shift) => job?.schedule?.includes(shift)) ?? "";

  return (
    <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Position title
        <input name="title" required defaultValue={job?.title} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy">
        Department
        <select name="department" required defaultValue={job?.department ?? "Operations"} className={fieldClass}>
          {JOB_DEPARTMENTS.map((department) => (
            <option key={department} value={department}>{department}</option>
          ))}
          {job?.department && !(JOB_DEPARTMENTS as readonly string[]).includes(job.department) ? (
            <option value={job.department}>{job.department}</option>
          ) : null}
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Category
        <select name="categoryId" defaultValue={job?.categoryId ?? ""} className={fieldClass}>
          <option value="">{categories.length ? "Select a category" : "No categories yet — run seed"}</option>
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
          {JOB_EMPLOYMENT_TYPES.map((value) => (
            <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Worker classification
        <select name="workerClassification" defaultValue={job?.workerClassification ?? "EMPLOYEE"} className={fieldClass}>
          {JOB_WORKER_CLASSIFICATIONS.map((value) => (
            <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Location
        <input name="location" required defaultValue={job?.location} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy">
        Work arrangement
        <select name="workArrangement" defaultValue={job?.workArrangement ?? "ONSITE"} className={fieldClass}>
          {JOB_WORK_ARRANGEMENTS.map((value) => (
            <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-navy">
        Shift / schedule type
        <select name="shift" defaultValue={selectedShift} className={fieldClass}>
          <option value="">Owner-configured</option>
          {JOB_SHIFTS.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>
      {job ? (
        <label className="text-sm font-semibold text-navy">
          Status
          <select name="status" defaultValue={job.status} className={fieldClass}>
            {JOB_STATUSES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      ) : (
        <p className="self-end text-sm text-muted">New postings are created as DRAFT and are not public.</p>
      )}
      <label className="text-sm font-semibold text-navy">
        Pay type
        <select name="payType" defaultValue={job?.payType ?? "HOURLY"} className={fieldClass}>
          {JOB_PAY_TYPES.map((value) => (
            <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
          ))}
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
        <textarea name="compensationNotes" rows={2} defaultValue={job?.compensationNotes ?? ""} placeholder="Leave blank unless the owner has approved pay language." className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Summary / job description
        <textarea name="description" required rows={5} defaultValue={job?.description} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Essential duties / responsibilities
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
        Schedule details
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
        Vehicle / insurance requirements
        <textarea name="vehicleRequirements" rows={2} defaultValue={job?.vehicleRequirements ?? ""} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Required certifications / documents (plain-language notes)
        <textarea name="requiredCertifications" rows={2} defaultValue={job?.requiredCertifications ?? ""} className={fieldClass} />
      </label>
      <fieldset className="sm:col-span-2 rounded-xl border border-line p-4">
        <legend className="text-sm font-semibold text-navy">Onboarding / compliance requirements</legend>
        <p className="mt-1 text-xs text-muted">
          Selected requirements are stored on the job and assigned when someone applies. They are not hard-coded in the public apply UI.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {requirements.map((requirement) => (
            <li key={requirement.id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="requirementId"
                  value={requirement.id}
                  defaultChecked={selectedRequirementIds.includes(requirement.id)}
                />
                {requirement.name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <label className="text-sm font-semibold text-navy sm:col-span-2">
        Application questions (one per line)
        <textarea
          name="questions"
          rows={4}
          defaultValue={questions.map((question) => question.prompt).join("\n")}
          className={fieldClass}
        />
      </label>
      <button type="submit" className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-medical sm:col-span-2 sm:w-fit">
        {job ? "Save job" : "Create draft"}
      </button>
    </form>
  );
}
