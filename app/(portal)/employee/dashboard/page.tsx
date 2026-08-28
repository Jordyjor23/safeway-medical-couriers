import { createIncident } from "@/app/(portal)/deliveries/actions";
import { prisma } from "@/lib/db";
import { assertSameEmployee, requirePortal } from "@/lib/rbac";

export default async function EmployeeDashboardPage() {
  const ctx = await requirePortal("employee");
  const employee = ctx.user.employeeId
    ? await prisma.employee.findUnique({
        where: { id: ctx.user.employeeId },
        include: {
          trainings: true,
          tasks: { orderBy: { createdAt: "desc" } },
          manager: true,
          documents: { include: { document: true } },
        },
      })
    : null;
  if (employee) assertSameEmployee(ctx, employee.id);
  const incidents = await prisma.incidentReport.findMany({
    where: { reporterUserId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-navy">My portal</h1>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My profile</h2>
        {employee ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Name</dt><dd>{employee.legalFirstName} {employee.legalLastName}</dd></div>
            <div><dt className="text-muted">Employee ID</dt><dd>{employee.employeeNumber}</dd></div>
            <div><dt className="text-muted">Title</dt><dd>{employee.jobTitle}</dd></div>
            <div><dt className="text-muted">Department</dt><dd>{employee.department ?? "—"}</dd></div>
            <div><dt className="text-muted">Manager</dt><dd>{employee.manager ? `${employee.manager.legalFirstName} ${employee.manager.legalLastName}` : "—"}</dd></div>
            <div><dt className="text-muted">Email</dt><dd>{employee.email}</dd></div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted">No employee profile is linked to this login yet.</p>
        )}
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My documents</h2>
        {employee?.documents.length ? (
          <ul className="mt-2 text-sm">
            {employee.documents.map((link) => (
              <li key={link.id}>
                {link.document.name} · {link.document.category.replaceAll("_", " ")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No assigned handbook, policy, or SOP files yet.</p>
        )}
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My training</h2>
        {employee?.trainings.length ? (
          <ul className="mt-2 text-sm">
            {employee.trainings.map((training) => (
              <li key={training.id}>
                {training.title} · expires {training.expiresAt?.toLocaleDateString() ?? "n/a"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No assigned training records.</p>
        )}
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My tasks</h2>
        {employee?.tasks.length ? (
          <ul className="mt-2 text-sm">
            {employee.tasks.map((task) => (
              <li key={task.id}>
                {task.title} {task.dueAt ? `· due ${task.dueAt.toLocaleDateString()}` : ""} {task.completedAt ? "· done" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No assigned tasks.</p>
        )}
      </section>
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-semibold text-navy">My incidents</h2>
        <form action={createIncident} className="mt-3 grid gap-2">
          <select name="type" className="rounded-lg border border-line px-3 py-2 text-sm">
            <option value="SAFETY">Safety concern</option>
            <option value="EXPOSURE">Exposure</option>
            <option value="VEHICLE">Vehicle issue</option>
            <option value="PACKAGE">Package incident</option>
            <option value="SECURITY">Security incident</option>
          </select>
          <input name="title" required placeholder="Title" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <textarea name="body" required placeholder="Details" className="rounded-lg border border-line px-3 py-2 text-sm" />
          <button className="w-fit rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Submit report</button>
        </form>
        <ul className="mt-4 text-sm">
          {incidents.map((incident) => (
            <li key={incident.id}>{incident.title} · {incident.status} · {incident.createdAt.toLocaleDateString()}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
