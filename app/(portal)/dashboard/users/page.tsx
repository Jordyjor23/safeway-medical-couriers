import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ROLE_LABELS, type RoleKey } from "@/lib/permissions";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage() {
  await requirePermission("users.manage");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { roles: { include: { role: true } } },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Users & roles</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Server-side roles control access. The owner role cannot be removed if it is the last owner.
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">MFA</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={4}>
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-navy">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.roles
                      .map((assignment) => ROLE_LABELS[assignment.role.key as RoleKey])
                      .join(", ") || "None"}
                  </td>
                  <td className="px-4 py-3">{user.twoFactorEnabled ? "Enabled" : "Not enabled"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
