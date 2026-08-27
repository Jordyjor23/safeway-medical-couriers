"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 transition focus:border-medical focus:ring-2";

type Question = { id: string; prompt: string; required: boolean };

type JobInfo = {
  publicId: string;
  title: string;
  requiresDriversLicense: boolean;
  isMedicalCourier: boolean;
  workerClassification: "EMPLOYEE" | "INDEPENDENT_CONTRACTOR";
  questions: Question[];
};

type EmploymentRow = {
  employerName: string;
  positionTitle: string;
  startDate: string;
  endDate: string;
  responsibilities: string;
  reasonForLeaving: string;
  permissionToContact: boolean;
};

const emptyEmployment = (): EmploymentRow => ({
  employerName: "",
  positionTitle: "",
  startDate: "",
  endDate: "",
  responsibilities: "",
  reasonForLeaving: "",
  permissionToContact: false,
});

export function ApplicationForm({
  job,
  acknowledgement,
  privacyHref,
  accommodationEmail,
}: {
  job: JobInfo;
  acknowledgement: string;
  privacyHref: string;
  accommodationEmail: string;
}) {
  const router = useRouter();
  const storageKey = useMemo(() => `safeway-application-${job.publicId}`, [job.publicId]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [employment, setEmployment] = useState<EmploymentRow[]>([emptyEmployment()]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { employment?: EmploymentRow[] };
      // Restore a client-only draft after mount so server HTML stays stable.
      if (parsed.employment?.length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydrate
        setEmployment(parsed.employment);
      }
      const form = document.getElementById("application-form") as HTMLFormElement | null;
      if (!form) return;
      for (const [key, value] of Object.entries(parsed)) {
        if (key === "employment") continue;
        const field = form.elements.namedItem(key);
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
          if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
            if (field.type === "checkbox") field.checked = Boolean(value);
          } else {
            field.value = String(value ?? "");
          }
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  function persist(form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem(storageKey, JSON.stringify({ ...data, employment }));
  }

  return (
    <form
      id="application-form"
      className="space-y-10"
      onChange={(event) => persist(event.currentTarget)}
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const bool = (name: string) => form.get(name) === "on" || form.get(name) === "true";
        const yesNo = (name: string) => form.get(name) === "yes";
        const payload = {
          jobPublicId: job.publicId,
          legalFirstName: String(form.get("legalFirstName") ?? ""),
          middleName: String(form.get("middleName") ?? "") || undefined,
          legalLastName: String(form.get("legalLastName") ?? ""),
          preferredName: String(form.get("preferredName") ?? "") || undefined,
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          city: String(form.get("city") ?? ""),
          state: String(form.get("state") ?? ""),
          zip: String(form.get("zip") ?? ""),
          preferredEmploymentType: String(form.get("preferredEmploymentType") ?? "") || undefined,
          availableStartDate: String(form.get("availableStartDate") ?? "") || undefined,
          generalAvailability: String(form.get("generalAvailability") ?? "") || undefined,
          preferredShift: String(form.get("preferredShift") ?? "") || undefined,
          fullTimePreference: form.get("fullTimePreference") === "full-time",
          serviceAreas: String(form.get("serviceAreas") ?? "") || undefined,
          weekdays: bool("weekdays"),
          weekends: bool("weekends"),
          holidays: bool("holidays"),
          earlyMornings: bool("earlyMornings"),
          evenings: bool("evenings"),
          overnight: bool("overnight"),
          onCallStat: bool("onCallStat"),
          authorizedToWorkUs: yesNo("authorizedToWorkUs"),
          requiresSponsorship: yesNo("requiresSponsorship"),
          highestEducation: String(form.get("highestEducation") ?? "") || undefined,
          relevantTraining: String(form.get("relevantTraining") ?? "") || undefined,
          licenses: String(form.get("licenses") ?? "") || undefined,
          certifications: String(form.get("certifications") ?? "") || undefined,
          courierExperience: String(form.get("courierExperience") ?? "") || undefined,
          healthcareLogisticsExperience: String(form.get("healthcareLogisticsExperience") ?? "") || undefined,
          customerServiceExperience: String(form.get("customerServiceExperience") ?? "") || undefined,
          dispatchExperience: String(form.get("dispatchExperience") ?? "") || undefined,
          technologyExperience: String(form.get("technologyExperience") ?? "") || undefined,
          canPerformEssentialFunctions: yesNo("canPerformEssentialFunctions"),
          hipaaTraining: bool("hipaaTraining"),
          bloodbornePathogensTraining: bool("bloodbornePathogensTraining"),
          hazmatAwarenessTraining: bool("hazmatAwarenessTraining"),
          un3373Training: bool("un3373Training"),
          chainOfCustodyTraining: bool("chainOfCustodyTraining"),
          temperatureControlledExperience: bool("temperatureControlledExperience"),
          pharmaceuticalDeliveryExperience: bool("pharmaceuticalDeliveryExperience"),
          laboratoryCourierExperience: bool("laboratoryCourierExperience"),
          hasValidDriversLicense: job.requiresDriversLicense ? yesNo("hasValidDriversLicense") : undefined,
          licenseIssuingState: String(form.get("licenseIssuingState") ?? "") || undefined,
          licenseClass: String(form.get("licenseClass") ?? "") || undefined,
          canMeetDrivingRequirements: job.requiresDriversLicense ? yesNo("canMeetDrivingRequirements") : undefined,
          hasPersonalVehicle: job.requiresDriversLicense ? yesNo("hasPersonalVehicle") : undefined,
          vehicleType: String(form.get("vehicleType") ?? "") || undefined,
          proofOfInsurance: job.requiresDriversLicense ? yesNo("proofOfInsurance") : undefined,
          canUseGpsApps: job.requiresDriversLicense ? yesNo("canUseGpsApps") : undefined,
          relevantCourierDrivingExperience: String(form.get("relevantCourierDrivingExperience") ?? "") || undefined,
          employmentHistory: employment.filter((row) => row.employerName && row.positionTitle && row.startDate),
          answers: job.questions.map((question) => ({
            questionId: question.id,
            answer: String(form.get(`answer-${question.id}`) ?? ""),
          })),
          acknowledgementAccepted: bool("acknowledgementAccepted") ? true : undefined,
          privacyReviewed: bool("privacyReviewed") ? true : undefined,
        };

        setPending(true);
        const response = await fetch("/api/careers/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => null);
        setPending(false);
        if (!response.ok) {
          setError(result?.error ?? "The application could not be submitted.");
          return;
        }
        localStorage.removeItem(storageKey);
        router.push(`/careers/apply/confirmation/${result.application.trackingNumber}?email=${encodeURIComponent(payload.email)}`);
      }}
    >
      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-xl font-semibold text-navy">Applicant information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Legal first name" name="legalFirstName" required autoComplete="given-name" />
          <Field label="Middle name (optional)" name="middleName" autoComplete="additional-name" />
          <Field label="Legal last name" name="legalLastName" required autoComplete="family-name" />
          <Field label="Preferred name (optional)" name="preferredName" />
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field label="Phone" name="phone" type="tel" required autoComplete="tel" />
          <Field label="City" name="city" required autoComplete="address-level2" />
          <Field label="State" name="state" required autoComplete="address-level1" />
          <Field label="ZIP code" name="zip" required autoComplete="postal-code" />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-xl font-semibold text-navy">Position information</h2>
        <p className="mt-2 text-sm text-muted">Applying for: {job.title}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-navy">
            Preferred employment type
            <select name="preferredEmploymentType" className={fieldClass} defaultValue="FULL_TIME">
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
              <option value="TEMPORARY">Temporary</option>
              <option value="SEASONAL">Seasonal</option>
            </select>
          </label>
          <Field label="Available start date" name="availableStartDate" type="date" />
          <Field label="Preferred shift" name="preferredShift" />
          <label className="text-sm font-semibold text-navy">
            Full-time / part-time preference
            <select name="fullTimePreference" className={fieldClass} defaultValue="full-time">
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-navy sm:col-span-2">
            Geographic areas you can service
            <textarea name="serviceAreas" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy sm:col-span-2">
            General availability
            <textarea name="generalAvailability" rows={3} className={fieldClass} />
          </label>
        </div>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-navy">Willing to work</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {["weekdays", "weekends", "holidays", "earlyMornings", "evenings", "overnight", "onCallStat"].map((name) => (
              <label key={name} className="flex items-center gap-2 text-sm text-navy">
                <input type="checkbox" name={name} className="h-4 w-4" />
                {name === "onCallStat" ? "On-call / STAT assignments" : name.replace(/([A-Z])/g, " $1")}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-xl font-semibold text-navy">Work authorization</h2>
        <YesNo name="authorizedToWorkUs" label="Are you legally authorized to work in the United States?" required />
        <YesNo name="requiresSponsorship" label="Will you now or in the future require employment sponsorship?" />
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-xl font-semibold text-navy">Employment history</h2>
        <p className="mt-2 text-sm text-muted">Do not include previous pay, salary, or benefits.</p>
        {employment.map((row, index) => (
          <div key={index} className="mt-4 grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2">
            <Field label="Employer name" value={row.employerName} onChange={(value) => updateEmployment(index, { employerName: value })} />
            <Field label="Position / title" value={row.positionTitle} onChange={(value) => updateEmployment(index, { positionTitle: value })} />
            <Field label="Start date" type="date" value={row.startDate} onChange={(value) => updateEmployment(index, { startDate: value })} />
            <Field label="End date" type="date" value={row.endDate} onChange={(value) => updateEmployment(index, { endDate: value })} />
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Responsibilities
              <textarea
                rows={3}
                className={fieldClass}
                value={row.responsibilities}
                onChange={(event) => updateEmployment(index, { responsibilities: event.target.value })}
              />
            </label>
            <Field label="Reason for leaving (optional)" value={row.reasonForLeaving} onChange={(value) => updateEmployment(index, { reasonForLeaving: value })} />
            <label className="flex items-center gap-2 text-sm font-semibold text-navy">
              <input
                type="checkbox"
                checked={row.permissionToContact}
                onChange={(event) => updateEmployment(index, { permissionToContact: event.target.checked })}
              />
              Permission to contact this employer
            </label>
          </div>
        ))}
        <button
          type="button"
          className="mt-4 text-sm font-semibold text-medical"
          onClick={() => setEmployment((rows) => [...rows, emptyEmployment()])}
        >
          Add another employer
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-xl font-semibold text-navy">Education and qualifications</h2>
        <p className="mt-2 text-sm text-muted">Graduation dates are not requested.</p>
        <div className="mt-4 grid gap-4">
          <Field label="Highest relevant education" name="highestEducation" />
          <label className="text-sm font-semibold text-navy">
            Relevant education or training
            <textarea name="relevantTraining" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Professional licenses
            <textarea name="licenses" rows={2} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Certifications
            <textarea name="certifications" rows={2} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Courier / logistics experience
            <textarea name="courierExperience" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Healthcare logistics experience
            <textarea name="healthcareLogisticsExperience" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Customer-service experience
            <textarea name="customerServiceExperience" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Dispatch experience
            <textarea name="dispatchExperience" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Technology experience (if job related)
            <textarea name="technologyExperience" rows={3} className={fieldClass} />
          </label>
        </div>
      </section>

      {job.requiresDriversLicense ? (
        <section className="rounded-2xl border border-line bg-paper p-6">
          <h2 className="text-xl font-semibold text-navy">Driver qualifications</h2>
          <p className="mt-2 text-sm text-muted">
            Do not enter a driver’s license number here. License numbers, MVR authorization, and
            insurance documents are collected later through a restricted onboarding workflow if needed.
          </p>
          <YesNo name="hasValidDriversLicense" label="Do you currently possess a valid driver’s license?" required />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="State of issuance" name="licenseIssuingState" />
            <Field label="License class (if relevant)" name="licenseClass" />
            <Field label="Vehicle type" name="vehicleType" />
          </div>
          <YesNo name="canMeetDrivingRequirements" label="Are you able to meet Safeway Couriers driving requirements?" />
          <YesNo name="hasPersonalVehicle" label="Do you have access to a personally supplied vehicle if this role requires one?" />
          <YesNo name="proofOfInsurance" label="Do you currently maintain required vehicle insurance?" />
          <YesNo name="canUseGpsApps" label="Are you able to use GPS and mobile applications?" />
          <label className="mt-4 block text-sm font-semibold text-navy">
            Relevant courier driving experience
            <textarea name="relevantCourierDrivingExperience" rows={3} className={fieldClass} />
          </label>
        </section>
      ) : null}

      {job.isMedicalCourier ? (
        <section className="rounded-2xl border border-line bg-paper p-6">
          <h2 className="text-xl font-semibold text-navy">Medical courier qualifications</h2>
          <p className="mt-2 text-sm text-muted">
            Existing training may be considered. Safeway Couriers may require company-specific
            training before assignment. Voluntary certificates are not government licenses unless
            they actually are.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["hipaaTraining", "HIPAA training"],
              ["bloodbornePathogensTraining", "Bloodborne Pathogens training"],
              ["hazmatAwarenessTraining", "DOT HazMat General Awareness"],
              ["un3373Training", "UN3373 / Biological Substance Category B training"],
              ["chainOfCustodyTraining", "Chain-of-custody training"],
              ["temperatureControlledExperience", "Temperature-controlled shipment experience"],
              ["pharmaceuticalDeliveryExperience", "Pharmaceutical delivery experience"],
              ["laboratoryCourierExperience", "Laboratory / specimen courier experience"],
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-2 text-sm text-navy">
                <input type="checkbox" name={name} className="h-4 w-4" />
                {label}
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-xl font-semibold text-navy">Job function</h2>
        <YesNo
          name="canPerformEssentialFunctions"
          label="Are you able to perform the essential functions of this position, with or without reasonable accommodation?"
          required
        />
        {job.questions.map((question) => (
          <label key={question.id} className="mt-4 block text-sm font-semibold text-navy">
            {question.prompt}
            <textarea name={`answer-${question.id}`} rows={3} required={question.required} className={fieldClass} />
          </label>
        ))}
        <p className="mt-4 text-sm text-muted">
          Safeway Couriers provides reasonable accommodations to qualified applicants with
          disabilities during the application and hiring process. Applicants who need assistance
          may contact{" "}
          <a className="font-semibold text-medical" href={`mailto:${accommodationEmail}`}>
            {accommodationEmail}
          </a>
          .
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-xl font-semibold text-navy">Acknowledgement</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{acknowledgement}</p>
        <label className="mt-4 flex items-start gap-2 text-sm font-semibold text-navy">
          <input type="checkbox" name="privacyReviewed" required className="mt-1 h-4 w-4" />
          I have reviewed the{" "}
          <Link href={privacyHref} className="text-medical underline">
            applicant privacy notice
          </Link>
          .
        </label>
        <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-navy">
          <input type="checkbox" name="acknowledgementAccepted" required className="mt-1 h-4 w-4" />
          I agree to the acknowledgement above.
        </label>
      </section>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-medical disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );

  function updateEmployment(index: number, patch: Partial<EmploymentRow>) {
    setEmployment((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }
}

function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  value,
  onChange,
}: {
  label: string;
  name?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="text-sm font-semibold text-navy">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className={fieldClass}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
    </label>
  );
}

function YesNo({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-semibold text-navy">{label}</legend>
      <div className="mt-2 flex gap-4">
        <label className="text-sm text-navy">
          <input type="radio" name={name} value="yes" required={required} className="mr-2" />
          Yes
        </label>
        <label className="text-sm text-navy">
          <input type="radio" name={name} value="no" required={required} className="mr-2" />
          No
        </label>
      </div>
    </fieldset>
  );
}
