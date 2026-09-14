import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { completeImplementationTaskAction } from "@/app/(portal)/dashboard/compliance/register/actions";
import { ComplianceLibraryNav } from "@/components/portal/ComplianceLibraryNav";
import { canManageCompanyLibrary, canViewCompanyLibraryAdmin } from "@/lib/compliance/library-access";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";

export const metadata: Metadata = { title: "Implementation tasks" };

export default async function ImplementationTasksPage() {
  const ctx = await requireAuth();
  if (!canViewCompanyLibraryAdmin(ctx.roles)) notFound();
  const tasks = await prisma.complianceImplementationTask.findMany({
    include: { sourceControlledDocument: true },
    orderBy: [{ status: "asc" }, { title: "asc" }],
  });
  const canManage = canManageCompanyLibrary(ctx.roles);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-medical">Compliance</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">Compliance implementation tasks</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Seeded templates stay OPEN until an Owner/Admin explicitly completes them. Nothing is
          auto-completed, including Owner / Managing Member approval (future e-sign only).
        </p>
        <ComplianceLibraryNav current="/dashboard/compliance/tasks" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-ice text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={6}>
                  Tasks appear after seed. They remain OPEN until explicitly completed.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{task.title}</p>
                    <p className="mt-1 text-xs text-muted">{task.description}</p>
                  </td>
                  <td className="px-4 py-3">{task.category.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{task.sourceControlledDocument?.controlledDocumentId ?? "—"}</td>
                  <td className="px-4 py-3">{task.assignedRole ?? "—"}</td>
                  <td className="px-4 py-3">{task.status}</td>
                  <td className="px-4 py-3">
                    {canManage && task.status === "OPEN" ? (
                      <form action={completeImplementationTaskAction} className="grid gap-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input name="notes" placeholder="Completion notes" className="rounded-lg border border-line px-2 py-1 text-xs" />
                        <button className="w-fit rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">
                          Mark completed
                        </button>
                      </form>
                    ) : (
                      task.completedAt?.toLocaleString() ?? "—"
                    )}
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
