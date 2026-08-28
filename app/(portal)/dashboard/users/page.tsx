import type { Metadata } from "next";
import Link from "next/link";
import { CreateStaffForm } from "@/components/portal/CreateStaffForm";
import { prisma } from "@/lib/db";
import { isOwnerRole, roleLabel } from "@/lib/permissions";
import { requirePermission } from "@/lib/rbac";

export const metadata: Metadata = { title: "User management" };

export default async function UsersPage() {
  const ctx = await requirePermission("users.manage");
  const [users, managers, customers] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        roles: { include: { role: true } },
        employee: true,
        customerUser: { include: { customer: true } },
      },
    }),
    prisma.employee.findMany({
      orderBy: [{ legalLastName: "asc" }, { legalFirstName: "asc" }],
      select: { id: true, legalFirstName: true, legalLastName: true },
    }),
    prisma.customer.findMany({
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">User management</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Each person gets their own account. Passwords are hashed and cannot be viewed after creation.
      </p>
      <CreateStaffForm
        managers={managers}
        customers={customers}
        canAssignOwner={isOwnerRole(ctx.roles)}
      />
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3">MFA</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/users/${user.id}`} className="font-medium text-navy hover:text-medical">
                    {user.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {user.employee?.employeeNumber ?? user.customerUser?.customer.clientNumber ?? "—"}
                </td>
                <td className="px-4 py-3">{user.username ?? "—"}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  {user.roles.map((assignment) => roleLabel(assignment.role.key)).join(", ") || "None"}
                </td>
                <td className="px-4 py-3">{user.employee?.department ?? "—"}</td>
                <td className="px-4 py-3">{user.accountStatus.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{user.lastLoginAt?.toLocaleString() ?? "Never"}</td>
                <td className="px-4 py-3">{user.twoFactorEnabled ? "On" : "Off"}</td>
                <td className="px-4 py-3">{user.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
