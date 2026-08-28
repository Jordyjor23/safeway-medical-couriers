import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setUserRole, updateUserProfile } from "@/app/(portal)/dashboard/users/actions";
import { UserAccountActions } from "@/components/portal/UserAccountActions";
import { prisma } from "@/lib/db";
import { hasPermission, requirePermission } from "@/lib/rbac";
import { ROLE_LABELS, SYSTEM_ROLE_KEYS, roleLabel } from "@/lib/permissions";

export const metadata: Metadata = { title: "User" };

const fieldClass = "mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const ctx = await requirePermission("users.manage");
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: { include: { role: true } },
      employee: true,
      customerUser: { include: { customer: true } },
    },
  });
  if (!user) notFound();
  const assigned = new Set(user.roles.map((assignment) => assignment.role.key));
  const save = updateUserProfile.bind(null, user.id);
  const canRoles = hasPermission(ctx, "roles.manage");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/users" className="text-sm font-semibold text-medical hover:underline">
          ← Users
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-navy">{user.name}</h1>
        <p className="text-sm text-muted">
          {user.employee?.employeeNumber ?? user.customerUser?.customer.clientNumber ?? "No staff ID"} ·{" "}
          {user.accountStatus.replaceAll("_", " ")}
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Profile</h2>
        <form action={save} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-navy">
            First name
            <input name="firstName" defaultValue={user.firstName ?? ""} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Last name
            <input name="lastName" defaultValue={user.lastName ?? ""} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Username
            <input name="username" defaultValue={user.username ?? ""} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-navy">
            Phone
            <input name="phone" defaultValue={user.phone ?? ""} className={fieldClass} />
          </label>
          <p className="text-sm text-muted sm:col-span-2">Email: {user.email}</p>
          <p className="text-sm text-muted">Last login: {user.lastLoginAt?.toLocaleString() ?? "Never"}</p>
          <p className="text-sm text-muted">
            Password last changed: {user.passwordChangedAt?.toLocaleString() ?? "Unknown"}
          </p>
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
            Save profile
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Roles</h2>
        <p className="mt-2 text-sm text-muted">
          {user.roles.map((assignment) => roleLabel(assignment.role.key)).join(", ") || "None"}
        </p>
        {canRoles ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {SYSTEM_ROLE_KEYS.map((key) => {
              const hasRole = assigned.has(key);
              return (
                <form action={setUserRole} key={key}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="roleKey" value={key} />
                  <input type="hidden" name="action" value={hasRole ? "revoke" : "grant"} />
                  <button
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      hasRole ? "bg-navy text-white" : "border border-line text-navy"
                    }`}
                  >
                    {hasRole ? `Remove ${ROLE_LABELS[key]}` : `Add ${ROLE_LABELS[key]}`}
                  </button>
                </form>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">Account actions</h2>
        <div className="mt-4">
          <UserAccountActions userId={user.id} status={user.accountStatus} isSelf={user.id === ctx.user.id} />
        </div>
      </section>
    </div>
  );
}
