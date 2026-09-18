"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const fieldClass = "mkt-field";
const DRAFT_DB_NAME = "safeway-career-drafts";
const DRAFT_DB_VERSION = 1;
const DRAFT_STORE = "resumeFiles";

type DraftState = {
  fields: Record<string, string[]>;
  employment?: EmploymentRow[];
};

function openDraftDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveResumeDraft(key: string, file: File) {
  const db = await openDraftDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    tx.objectStore(DRAFT_STORE).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadResumeDraft(key: string) {
  const db = await openDraftDb();
  const file = await new Promise<File | null>((resolve, reject) => {
    const request = db.transaction(DRAFT_STORE, "readonly").objectStore(DRAFT_STORE).get(key);
    request.onsuccess = () => resolve(request.result instanceof File ? request.result : null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return file;
}

async function deleteResumeDraft(key: string) {
  const db = await openDraftDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    tx.objectStore(DRAFT_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

function snapshotFormFields(form: HTMLFormElement) {
  const fields: Record<string, string[]> = {};
  for (const element of Array.from(form.elements)) {
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLTextAreaElement) &&
      !(element instanceof HTMLSelectElement)
    ) continue;
    if (!element.name || (element instanceof HTMLInputElement && element.type === "file")) continue;

    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      if (element.checked) (fields[element.name] ??= []).push(element.value);
      continue;
    }
    fields[element.name] = [element.value];
  }
  return fields;
}

function restoreFormFields(form: HTMLFormElement, fields: Record<string, string[]>) {
  for (const element of Array.from(form.elements)) {
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLTextAreaElement) &&
      !(element instanceof HTMLSelectElement)
    ) continue;
    if (!element.name || (element instanceof HTMLInputElement && element.type === "file")) continue;

    const values = fields[element.name] ?? [];
    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      element.checked = values.includes(element.value);
      continue;
    }
    if (values[0] !== undefined) element.value = values[0];
  }
}

const FIELD_LABELS: Record<string, string> = {
  legalFirstName: "Legal first name",
  legalLastName: "Legal last name",
  email: "Email",
  phone: "Phone",
  city: "City",
  state: "State",
  zip: "ZIP code",
  authorizedToWorkUs: "Are you legally authorized to work in the United States?",
  hasValidDriversLicense: "Do you currently possess a valid driver’s license?",
  canPerformEssentialFunctions:
    "Are you able to perform the essential functions of this position, with or without reasonable accommodation?",
  privacyReviewed: "Applicant privacy notice acknowledgement",
  acknowledgementAccepted: "Application acknowledgement",
};

function fieldLabel(name: string, questions: Question[]) {
  if (FIELD_LABELS[name]) return FIELD_LABELS[name];
  if (name.startsWith("answer-")) {
    return questions.find((item) => `answer-${item.id}` === name)?.prompt ?? "Required application question";
  }
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

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
  const [draftResume, setDraftResume] = useState<File | null>(null);
  const contractor = job.workerClassification === "INDEPENDENT_CONTRACTOR";

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    const form = document.getElementById("application-form") as HTMLFormElement | null;

    if (raw && form) {
      try {
        const parsed = JSON.parse(raw) as DraftState & Record<string, unknown>;
        if (parsed.employment?.length) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring an intentional browser draft
          setEmployment(parsed.employment);
        }
        if (parsed.fields) {
          restoreFormFields(form, parsed.fields);
        } else {
          // Backward compatibility for drafts saved before structured field snapshots.
          const legacyFields: Record<string, string[]> = {};
          for (const [key, value] of Object.entries(parsed)) {
            if (key === "employment" || value === undefined || value === null) continue;
            legacyFields[key] = [String(value)];
          }
          restoreFormFields(form, legacyFields);
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }

    loadResumeDraft(storageKey)
      .then((file) => {
        if (file) setDraftResume(file);
      })
      .catch(() => {
        // IndexedDB may be unavailable in hardened/private browser modes.
      });
  }, [storageKey]);

  function persist(form: HTMLFormElement, nextEmployment = employment) {
    const draft: DraftState = {
      fields: snapshotFormFields(form),
      employment: nextEmployment,
    };
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }

  return (
    <form
      id="application-form"
      className="space-y-10"
      noValidate
      onChange={(event) => persist(event.currentTarget)}
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);

        const formElement = event.currentTarget;
        const invalid = Array.from(
          formElement.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            "input:invalid, textarea:invalid, select:invalid",
          ),
        );
        if (invalid.length) {
          const missing = Array.from(
            new Set(invalid.map((element) => fieldLabel(element.name || "required field", job.questions))),
          );
          setError(`Please complete: ${missing.join(", ")}.`);
          invalid[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
          invalid[0]?.focus({ preventScroll: true });
          return;
        }

        const form = new FormData(formElement);
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
          preferredEmploymentType: contractor
            ? undefined
            : String(form.get("preferredEmploymentType") ?? "") || undefined,
          availableStartDate: String(form.get("availableStartDate") ?? "") || undefined,
          generalAvailability: String(form.get("generalAvailability") ?? "") || undefined,
          preferredShift: String(form.get("preferredShift") ?? "") || undefined,
          fullTimePreference: contractor ? undefined : form.get("fullTimePreference") === "full-time",
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

        const selectedResume = form.get("resume");
        const resume =
          selectedResume instanceof File && selectedResume.size > 0 ? selectedResume : draftResume;
        if (!(resume instanceof File) || resume.size === 0) {
          setError("Please complete: Resume / CV.");
          return;
        }

        const submission = new FormData();
        submission.set("application", JSON.stringify(payload));
        submission.set("resume", resume);

        setPending(true);
        const response = await fetch("/api/careers/applications", {
          method: "POST",
          body: submission,
        });
        const result = await response.json().catch(() => null);
        setPending(false);
        if (!response.ok) {
          const serverFields = Array.isArray(result?.fields)
            ? result.fields.map((name: string) => fieldLabel(name, job.questions))
            : [];
          const suffix = serverFields.length ? ` Missing or invalid: ${serverFields.join(", ")}.` : "";
          setError((result?.error ?? "The application could not be submitted.") + suffix);
          return;
        }
        localStorage.removeItem(storageKey);
        await deleteResumeDraft(storageKey).catch(() => undefined);
        router.push(`/careers/apply/confirmation/${result.application.trackingNumber}?email=${encodeURIComponent(payload.email)}`);
      }}
    >
      <section className="rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-semibold text-mist">Applicant information</h2>
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

      <section className="rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-semibold text-mist">Resume</h2>
        <p className="mt-2 text-sm text-mist-soft">
          Upload your current resume. It is stored privately and is only available to authorized Safeway hiring staff.
        </p>
        <label className="mt-4 block text-sm font-semibold text-mist">
          Resume / CV
          <input
            name="resume"
            type="file"
            required={!draftResume}
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className={fieldClass}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setDraftResume(file);
              if (file) {
                saveResumeDraft(storageKey, file).catch(() => undefined);
              } else {
                deleteResumeDraft(storageKey).catch(() => undefined);
              }
            }}
          />
        </label>
        {draftResume ? (
          <p className="mt-2 text-sm text-medical">Saved resume: {draftResume.name}</p>
        ) : null}
        <p className="mt-2 text-xs text-mist-soft">Accepted formats: PDF or DOCX. Maximum file size follows Safeway document-upload limits.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-semibold text-mist">Position information</h2>
        <p className="mt-2 text-sm text-mist-soft">Applying for: {job.title}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {!contractor ? (
            <>
              <label className="text-sm font-semibold text-mist">
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
              <label className="text-sm font-semibold text-mist">
                Full-time / part-time preference
                <select name="fullTimePreference" className={fieldClass} defaultValue="full-time">
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <Field label="Available to begin accepting assignments" name="availableStartDate" type="date" />
              <Field label="Preferred assignment times" name="preferredShift" />
            </>
          )}
          <label className="text-sm font-semibold text-mist sm:col-span-2">
            Geographic areas you can service
            <textarea name="serviceAreas" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-mist sm:col-span-2">
            General availability
            <textarea name="generalAvailability" rows={3} className={fieldClass} />
          </label>
        </div>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-mist">Willing to work</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {["weekdays", "weekends", "holidays", "earlyMornings", "evenings", "overnight", "onCallStat"].map((name) => (
              <label key={name} className="flex items-center gap-2 text-sm text-mist">
                <input type="checkbox" name={name} className="h-4 w-4" />
                {name === "onCallStat" ? "On-call / STAT assignments" : name.replace(/([A-Z])/g, " $1")}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-semibold text-mist">{contractor ? "Contractor eligibility" : "Work authorization"}</h2>
        <YesNo
          name="authorizedToWorkUs"
          label={
            contractor
              ? "Are you legally able to perform independent contractor services in the United States?"
              : "Are you legally authorized to work in the United States?"
          }
          required
        />
        {!contractor ? (
          <YesNo name="requiresSponsorship" label="Will you now or in the future require employment sponsorship?" />
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-semibold text-mist">Employment history</h2>
        <p className="mt-2 text-sm text-mist-soft">Do not include previous pay, salary, or benefits.</p>
        {employment.map((row, index) => (
          <div key={index} className="mt-4 grid gap-4 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
            <Field label="Employer name" value={row.employerName} onChange={(value) => updateEmployment(index, { employerName: value })} />
            <Field label="Position / title" value={row.positionTitle} onChange={(value) => updateEmployment(index, { positionTitle: value })} />
            <Field label="Start date" type="date" value={row.startDate} onChange={(value) => updateEmployment(index, { startDate: value })} />
            <Field label="End date" type="date" value={row.endDate} onChange={(value) => updateEmployment(index, { endDate: value })} />
            <label className="text-sm font-semibold text-mist sm:col-span-2">
              Responsibilities
              <textarea
                rows={3}
                className={fieldClass}
                value={row.responsibilities}
                onChange={(event) => updateEmployment(index, { responsibilities: event.target.value })}
              />
            </label>
            <Field label="Reason for leaving (optional)" value={row.reasonForLeaving} onChange={(value) => updateEmployment(index, { reasonForLeaving: value })} />
            <label className="flex items-center gap-2 text-sm font-semibold text-mist">
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

      <section className="rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-semibold text-mist">Education and qualifications</h2>
        <p className="mt-2 text-sm text-mist-soft">Graduation dates are not requested.</p>
        <div className="mt-4 grid gap-4">
          <label className="text-sm font-semibold text-mist">
            Highest relevant education
            <select name="highestEducation" className={fieldClass} defaultValue="">
              <option value="">Select education level</option>
              <option value="High school diploma">High school diploma</option>
              <option value="GED / high school equivalency">GED / high school equivalency</option>
              <option value="Some college">Some college</option>
              <option value="Trade / technical certificate">Trade / technical certificate</option>
              <option value="Associate degree">Associate degree</option>
              <option value="Bachelor’s degree">Bachelor’s degree</option>
              <option value="Master’s degree">Master’s degree</option>
              <option value="Doctoral / professional degree">Doctoral / professional degree</option>
              <option value="Other">Other</option>
              <option value="Prefer not to answer">Prefer not to answer</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-mist">
            Relevant education or training
            <textarea name="relevantTraining" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-mist">
            Professional licenses
            <textarea name="licenses" rows={2} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-mist">
            Certifications
            <textarea name="certifications" rows={2} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-mist">
            Courier / logistics experience
            <textarea name="courierExperience" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-mist">
            Healthcare logistics experience
            <textarea name="healthcareLogisticsExperience" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-mist">
            Customer-service experience
            <textarea name="customerServiceExperience" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-mist">
            Dispatch experience
            <textarea name="dispatchExperience" rows={3} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-mist">
            Technology experience (if job related)
            <textarea name="technologyExperience" rows={3} className={fieldClass} />
          </label>
        </div>
      </section>

      {job.requiresDriversLicense ? (
        <section className="rounded-2xl border border-white/10 bg-panel p-6">
          <h2 className="text-xl font-semibold text-mist">Driver qualifications</h2>
          <p className="mt-2 text-sm text-mist-soft">
            Do not enter a driver’s license number here. License numbers, MVR authorization, and
            insurance documents are collected later through a restricted onboarding workflow if needed.
          </p>
          <YesNo name="hasValidDriversLicense" label="Do you currently possess a valid driver’s license?" required />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-mist">
              State of issuance
              <select name="licenseIssuingState" className={fieldClass} defaultValue="">
                <option value="">Select state</option>
                {[
                  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
                  "District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
                  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota",
                  "Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
                  "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon",
                  "Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah",
                  "Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
                ].map((stateName) => (
                  <option key={stateName} value={stateName}>{stateName}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-mist">
              License class (if relevant)
              <select name="licenseClass" className={fieldClass} defaultValue="">
                <option value="">Select license class</option>
                <option value="Standard / Class D">Standard / Class D</option>
                <option value="CDL Class A">CDL Class A</option>
                <option value="CDL Class B">CDL Class B</option>
                <option value="CDL Class C">CDL Class C</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-mist">
              Vehicle type
              <select name="vehicleType" className={fieldClass} defaultValue="">
                <option value="">Select vehicle type</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Minivan">Minivan</option>
                <option value="Cargo van">Cargo van</option>
                <option value="Pickup truck">Pickup truck</option>
                <option value="Sprinter / large van">Sprinter / large van</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
          <YesNo name="canMeetDrivingRequirements" label="Are you able to meet Safeway Couriers driving requirements?" />
          <YesNo name="hasPersonalVehicle" label="Do you have access to a personally supplied vehicle if this role requires one?" />
          <YesNo name="proofOfInsurance" label="Do you currently maintain required vehicle insurance?" />
          <YesNo name="canUseGpsApps" label="Are you able to use GPS and mobile applications?" />
          <label className="mt-4 block text-sm font-semibold text-mist">
            Relevant courier driving experience
            <textarea name="relevantCourierDrivingExperience" rows={3} className={fieldClass} />
          </label>
        </section>
      ) : null}

      {job.isMedicalCourier ? (
        <section className="rounded-2xl border border-white/10 bg-panel p-6">
          <h2 className="text-xl font-semibold text-mist">Medical courier qualifications</h2>
          <p className="mt-2 text-sm text-mist-soft">
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
              <label key={name} className="flex items-center gap-2 text-sm text-mist">
                <input type="checkbox" name={name} className="h-4 w-4" />
                {label}
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-semibold text-mist">Job function</h2>
        <YesNo
          name="canPerformEssentialFunctions"
          label="Are you able to perform the essential functions of this position, with or without reasonable accommodation?"
          required
        />
        {job.questions.map((question) => (
          <label key={question.id} className="mt-4 block text-sm font-semibold text-mist">
            {question.prompt}
            <textarea name={`answer-${question.id}`} rows={3} required={question.required} className={fieldClass} />
          </label>
        ))}
        <p className="mt-4 text-sm text-mist-soft">
          Safeway Couriers provides reasonable accommodations to qualified applicants with
          disabilities during the application and hiring process. Applicants who need assistance
          may contact{" "}
          <a className="font-semibold text-medical" href={`mailto:${accommodationEmail}`}>
            {accommodationEmail}
          </a>
          .
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-semibold text-mist">Acknowledgement</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-mist-soft">{acknowledgement}</p>
        <label className="mt-4 flex items-start gap-2 text-sm font-semibold text-mist">
          <input type="checkbox" name="privacyReviewed" required className="mt-1 h-4 w-4" />
          I have reviewed the{" "}
          <Link
            href={privacyHref}
            target="_blank"
            rel="noreferrer"
            className="text-medical underline"
          >
            applicant privacy notice
          </Link>
          .
        </label>
        <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-mist">
          <input type="checkbox" name="acknowledgementAccepted" required className="mt-1 h-4 w-4" />
          I agree to the acknowledgement above.
        </label>
      </section>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mkt-btn mkt-btn-primary disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );

  function updateEmployment(index: number, patch: Partial<EmploymentRow>) {
    setEmployment((rows) => {
      const nextRows = rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
      const form = document.getElementById("application-form") as HTMLFormElement | null;
      if (form) persist(form, nextRows);
      return nextRows;
    });
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
    <label className="text-sm font-semibold text-mist">
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
      <legend className="text-sm font-semibold text-mist">{label}</legend>
      <div className="mt-2 flex gap-4">
        <label className="text-sm text-mist">
          <input type="radio" name={name} value="yes" required={required} className="mr-2" />
          Yes
        </label>
        <label className="text-sm text-mist">
          <input type="radio" name={name} value="no" required={required} className="mr-2" />
          No
        </label>
      </div>
    </fieldset>
  );
}
