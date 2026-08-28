import type { Metadata } from "next";
import { createCustomRole, saveRolePermissions } from "@/app/(portal)/dashboard/roles/actions";
import { prisma } from "@/lib/db";
import { PERMISSIONS, roleLabel } from "@/lib/permissions";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  await requirePermission("permission.manage");
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { permissions: { include: { permission: true } }, users: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-navy">Roles & permissions</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Permission changes are stored in the database and apply on the next request. The Owner role
          always retains full access.
        </p>
      </div>

      <form action={createCustomRole} className="grid gap-3 rounded-2xl border border-line bg-paper p-5 sm:grid-cols-2">
        <h2 className="text-lg font-semibold text-navy sm:col-span-2">Create custom role</h2>
        <input name="name" required placeholder="Display name" className="rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="key" placeholder="KEY_NAME (optional)" className="rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="description" placeholder="Description" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
        <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Create role</button>
      </form>

      {roles.map((role) => {
        const assigned = new Set(role.permissions.map((link) => link.permission.key));
        return (
          <section key={role.id} className="rounded-2xl border border-line bg-paper p-5">
            <h2 className="font-semibold text-navy">{roleLabel(role.key)}</h2>
            <p className="text-sm text-muted">
              {role.key} · {role.system ? "System role" : "Custom role"} · {role.users.length} users
            </p>
            {role.key === "OWNER" ? (
              <p className="mt-3 text-sm text-muted">Owner permissions cannot be reduced.</p>
            ) : (
              <form action={saveRolePermissions} className="mt-4">
                <input type="hidden" name="roleId" value={role.id} />
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {PERMISSIONS.map((permission) => (
                    <li key={permission}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="permission"
                          value={permission}
                          defaultChecked={assigned.has(permission)}
                        />
                        {permission}
                      </label>
                    </li>
                  ))}
                </ul>
                <button className="mt-4 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
                  Save permissions
                </button>
              </form>
            )}
          </section>
        );
      })}
    </div>
  );
}
