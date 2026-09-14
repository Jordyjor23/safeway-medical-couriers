import type { Prisma } from "@prisma/client";
import { hasHrEditSystemRole, hasHrReviewSystemRole } from "@/lib/permissions";

export type ApplicationActor = {
  user: { id: string; applicantId?: string | null; employeeId?: string | null };
  roles: string[];
  permissions: Set<string>;
};

export function canReviewApplications(ctx: ApplicationActor) {
  return hasHrReviewSystemRole(ctx.roles);
}

export function canEditApplications(ctx: ApplicationActor) {
  return hasHrEditSystemRole(ctx.roles);
}

export function canAddApplicationNotes(ctx: ApplicationActor) {
  return canReviewApplications(ctx);
}

export function canAccessApplication(
  ctx: ApplicationActor,
  application: { applicantId: string; applicant?: { userId?: string | null } },
) {
  if (canReviewApplications(ctx)) return true;
  if (ctx.roles.includes("APPLICANT") && ctx.user.applicantId && ctx.user.applicantId === application.applicantId) {
    return true;
  }
  if (application.applicant?.userId && application.applicant.userId === ctx.user.id) {
    return true;
  }
  return false;
}

export function applicationsListWhere(ctx: ApplicationActor): Prisma.ApplicationWhereInput {
  if (canReviewApplications(ctx)) return {};
  if (ctx.user.applicantId) {
    return { applicantId: ctx.user.applicantId };
  }
  return { id: { in: [] } };
}

export function notFoundSafeError() {
  return { error: "Not found." as const };
}
