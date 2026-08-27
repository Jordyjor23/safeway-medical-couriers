import type { Metadata } from "next";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requirePermission("audit.view");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-navy">Audit log</h1>
      <p className="mt-2 text-sm text-muted">
        Append-only activity history. Administrators cannot delete these records from the portal.
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={4}>
                  No audit events yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {log.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{log.actorEmail ?? "system"}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">
                    {log.targetType}
                    {log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
