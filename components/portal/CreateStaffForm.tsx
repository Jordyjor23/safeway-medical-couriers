"use client";

import { useState } from "react";
import { createStaffUser } from "@/app/(portal)/dashboard/users/actions";
import { ROLE_LABELS, SYSTEM_ROLE_KEYS, type RoleKey } from "@/lib/permissions";

const fieldClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-medical/25 focus:border-medical focus:ring-2";

type Created = {
  username: string;
  employeeNumber: string | null;
  temporaryPassword: string;
  activationUrl: string;
};

export function CreateStaffForm({
  managers,
  customers,
  canAssignOwner = false,
}: {
  managers: { id: string; legalFirstName: string; legalLastName: string }[];
  customers: { id: string; legalName: string }[];
  canAssignOwner?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2"
      action={async (formData) => {
        setError(null);
        setCreated(null);
        setPending(true);
        const result = await createStaffUser(formData);
        setPending(false);
        if (result && "error" in result && result.error) {
          setError(result.error);
          return;
        }
        if (result && "ok" in result && result.ok) {
          setCreated({
            username: result.username,
            employeeNumber: result.employeeNumber,
            temporaryPassword: result.temporaryPassword,
            activationUrl: result.activationUrl,
          });
          (document.getElementById("create-staff-form") as HTMLFormElement | null)?.reset();
        }
      }}
      id="create-staff-form"
    >
      <h2 className="text-lg font-semibold text-navy sm:col-span-2">Create user</h2>
      <input name="firstName" required placeholder="First name" className={fieldClass} />
      <input name="lastName" required placeholder="Last name" className={fieldClass} />
      <input name="email" type="email" required placeholder="Email" className={fieldClass} />
      <input name="phone" placeholder="Phone" className={fieldClass} />
      <input name="username" placeholder="Username (optional)" className={fieldClass} />
      <input name="jobTitle" placeholder="Job title" className={fieldClass} />
      <input name="department" placeholder="Department" className={fieldClass} />
      <select name="roleKey" defaultValue="EMPLOYEE" className={fieldClass}>
        {SYSTEM_ROLE_KEYS.filter((key) => key !== "OWNER" || canAssignOwner).map((key: RoleKey) => (
          <option key={key} value={key}>
            {ROLE_LABELS[key]}
          </option>
        ))}
      </select>
      <select name="employmentStatus" className={fieldClass}>
        <option value="PENDING_ONBOARDING">Pending onboarding</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>
      <label className="text-sm">
        Hire date
        <input name="hireDate" type="date" className={`${fieldClass} mt-1`} />
      </label>
      <select name="managerId" className={fieldClass}>
        <option value="">Manager (optional)</option>
        {managers.map((manager) => (
          <option key={manager.id} value={manager.id}>
            {manager.legalFirstName} {manager.legalLastName}
          </option>
        ))}
      </select>
      <select name="customerId" className={fieldClass}>
        <option value="">Customer organization (for client logins)</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.legalName}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted sm:col-span-2">
        The account starts pending activation. A unique employee or driver ID and username are
        generated automatically. The temporary password is shown once and cannot be retrieved later.
      </p>
      {error ? (
        <p className="text-sm text-red-700 sm:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
      {created ? (
        <div className="rounded-xl border border-medical/30 bg-ice p-4 text-sm text-navy sm:col-span-2">
          <p className="font-semibold">Account created. Copy these details now.</p>
          <p className="mt-2">Username: {created.username}</p>
          {created.employeeNumber ? <p>ID: {created.employeeNumber}</p> : null}
          <p>Temporary password: {created.temporaryPassword}</p>
          <p className="mt-2 break-all">Activation link: {created.activationUrl}</p>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white sm:w-fit disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
