import { isCompanyLibraryManager } from "@/lib/compliance/library-catalog";

export type CompanyAssignmentRecord = {
  active: boolean;
  action: string;
  audience: string;
  roleKey?: string | null;
  employeeId?: string | null;
  jobOpeningId?: string | null;
  controlledDocumentId?: string | null;
  companyDocumentId?: string | null;
};

export type CompanyLibraryActor = {
  roles: string[];
  employeeId?: string | null;
  applicantId?: string | null;
  isDriver?: boolean;
  jobOpeningIds?: string[];
};

export function canManageCompanyLibrary(roles: string[]) {
  return isCompanyLibraryManager(roles);
}

export function canViewCompanyLibraryAdmin(roles: string[]) {
  return canManageCompanyLibrary(roles) || roles.includes("COMPLIANCE_ADMIN");
}

export function assignmentMatchesActor(assignment: CompanyAssignmentRecord, actor: CompanyLibraryActor) {
  if (!assignment.active) return false;
  switch (assignment.audience) {
    case "ALL_EMPLOYEES":
      return Boolean(actor.employeeId);
    case "ALL_DRIVERS":
      return Boolean(actor.isDriver);
    case "ROLE":
      return Boolean(assignment.roleKey && actor.roles.includes(assignment.roleKey));
    case "EMPLOYEE":
      return Boolean(assignment.employeeId && assignment.employeeId === actor.employeeId);
    case "APPLICANTS":
      return Boolean(actor.applicantId && actor.roles.includes("APPLICANT"));
    case "FUTURE_HIRES":
      return Boolean(actor.employeeId);
    case "JOB":
      return Boolean(assignment.jobOpeningId && actor.jobOpeningIds?.includes(assignment.jobOpeningId));
    default:
      return false;
  }
}

export function actorHasCompanyAssignment(
  assignments: CompanyAssignmentRecord[] | undefined,
  actor: CompanyLibraryActor,
  actions?: string[],
) {
  return (assignments ?? []).some((assignment) => {
    if (actions && !actions.includes(assignment.action)) return false;
    return assignmentMatchesActor(assignment, actor);
  });
}

export function canAccessAssignedCompanyDocument(args: {
  roles: string[];
  publicationStatus?: string | null;
  assignments?: CompanyAssignmentRecord[];
  actor: CompanyLibraryActor;
  action?: "view" | "download" | "acknowledge";
}) {
  if (canManageCompanyLibrary(args.roles)) return true;
  if (args.publicationStatus && args.publicationStatus !== "ACTIVE" && args.publicationStatus !== "SUPERSEDED") {
    return false;
  }
  const wholeDocumentAssignments = (args.assignments ?? []).filter((assignment) => !assignment.controlledDocumentId);
  if (args.action === "acknowledge") {
    return actorHasCompanyAssignment(wholeDocumentAssignments, args.actor, ["READ_AND_ACKNOWLEDGE", "SIGN"]);
  }
  return actorHasCompanyAssignment(wholeDocumentAssignments, args.actor);
}

export function canAccessAssignedControlledDocument(args: {
  roles: string[];
  status?: string | null;
  active?: boolean;
  assignments?: CompanyAssignmentRecord[];
  actor: CompanyLibraryActor;
  controlledDocumentId: string;
  action?: "view" | "download" | "acknowledge";
}) {
  if (canManageCompanyLibrary(args.roles)) return true;
  if (args.status && args.status !== "ACTIVE" && args.status !== "SUPERSEDED") return false;
  if (args.active === false) return false;
  const sectionAssignments = (args.assignments ?? []).filter(
    (assignment) => assignment.controlledDocumentId === args.controlledDocumentId,
  );
  if (args.action === "acknowledge") {
    return actorHasCompanyAssignment(sectionAssignments, args.actor, ["READ_AND_ACKNOWLEDGE", "SIGN"]);
  }
  return actorHasCompanyAssignment(sectionAssignments, args.actor);
}

export function employeeCannotManageCompanyLibrary(roles: string[]) {
  return !canManageCompanyLibrary(roles);
}

export function employeeCannotEditControlledMetadata(roles: string[]) {
  return !canManageCompanyLibrary(roles);
}
