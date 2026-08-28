"use client";

import { useState } from "react";
import { createEmployee } from "@/app/(portal)/dashboard/employees/actions";

const fieldClass = "rounded-lg border border-line px-3 py-2 text-sm";

export function CreateEmployeeForm() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2"
      action={async (formData) => {
        setError(null);
        setNotice(null);
        setPending(true);
        const result = await createEmployee(formData);
        setPending(false);
        if (result && "error" in result && result.error) {
          setError(result.error);
          return;
        }
        if (result && "ok" in result && result.ok) {
          if (result.warning) {
            setNotice(result.warning);
          } else {
            setNotice(
              result.username
                ? `Employee created. An activation email was sent. Username: ${result.username}`
                : "Employee created. An activation email was sent.",
            );
          }
          (document.getElementById("create-employee-form") as HTMLFormElement | null)?.reset();
        }
      }}
      id="create-employee-form"
    >
      <h2 className="text-lg font-semibold text-navy sm:col-span-2">Add employee</h2>
      <input name="legalFirstName" required placeholder="First name" className={fieldClass} />
      <input name="legalLastName" required placeholder="Last name" className={fieldClass} />
      <input name="preferredName" placeholder="Preferred name" className={fieldClass} />
      <input name="email" type="email" required placeholder="Email" className={fieldClass} />
      <input name="phone" placeholder="Phone" className={fieldClass} />
      <input name="jobTitle" required placeholder="Job title" className={fieldClass} />
      <input name="department" placeholder="Department" className={fieldClass} />
      <select name="classification" className={fieldClass}>
        <option value="W2_EMPLOYEE">W-2 employee</option>
        <option value="INDEPENDENT_CONTRACTOR">Independent contractor</option>
      </select>
      <select name="roleKey" defaultValue="EMPLOYEE" className={fieldClass}>
        <option value="EMPLOYEE">Employee portal role</option>
        <option value="DRIVER">Driver portal role</option>
      </select>
      <select name="status" className={fieldClass}>
        <option value="PENDING_ONBOARDING">Pending onboarding</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="TERMINATED">Terminated</option>
      </select>
      <label className="text-sm">
        Hire date
        <input name="hireDate" type="date" className={`${fieldClass} mt-1 w-full`} />
      </label>
      <p className="text-xs text-muted sm:col-span-2">
        Creating an employee also creates a pending portal account and emails a one-time activation
        link. The employee sets their own password. Passwords are never emailed.
      </p>
      {error ? (
        <p className="text-sm text-red-700 sm:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm text-navy sm:col-span-2" role="status">
          {notice}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:col-span-2 sm:w-fit disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create employee"}
      </button>
    </form>
  );
}
