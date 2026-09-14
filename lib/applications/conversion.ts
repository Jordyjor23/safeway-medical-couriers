import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { nextScopedId } from "@/lib/ids";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { policyDomainFor } from "@/lib/documents/policy";
import { issueActivation } from "@/lib/activation";
import { provisionEmployeePortalUser } from "@/lib/portal-account";

export type ConversionResult =
  | { error: string }
  | {
      ok: true;
      employeeId: string;
      created: boolean;
      linkedDocumentIds: string[];
    };

/**
 * Idempotent applicant → employee conversion.
 * Relinks existing ManagedDocument rows. Does not copy blobs.
 */
export async function convertApplicationToEmployee(args: {
  applicationId: string;
  actorId: string;
  actorEmail?: string | null;
}): Promise<ConversionResult> {
  const current = await prisma.application.findUnique({
    where: { id: args.applicationId },
    include: {
      applicant: { include: { user: { include: { roles: { include: { role: true } } } } } },
      jobOpening: true,
      employee: true,
      documents: true,
      conversions: true,
    },
  });
  if (!current) return { error: "Not found." };

  const existingConversion = current.conversions[0];
  if (existingConversion) {
    const linked = await relinkApplicantDocuments({
      applicationId: current.id,
      employeeId: existingConversion.employeeId,
    });
    return {
      ok: true,
      employeeId: existingConversion.employeeId,
      created: false,
      linkedDocumentIds: linked,
    };
  }

  if (current.employee) {
    const linked = await relinkApplicantDocuments({
      applicationId: current.id,
      employeeId: current.employee.id,
    });
    await recordConversion({
      applicationId: current.id,
      applicantId: current.applicantId,
      employeeId: current.employee.id,
      userId: current.employee.userId ?? current.applicant.userId,
      convertedById: args.actorId,
      documentIds: linked,
    });
    return {
      ok: true,
      employeeId: current.employee.id,
      created: false,
      linkedDocumentIds: linked,
    };
  }

  const employee = await prisma.employee.create({
    data: {
      employeeNumber: await nextScopedId("EMP"),
      applicationId: current.id,
      userId: current.applicant.userId,
      legalFirstName: current.applicant.legalFirstName,
      legalLastName: current.applicant.legalLastName,
      preferredName: current.applicant.preferredName,
      email: current.applicant.email,
      phone: current.applicant.phone,
      jobTitle: current.jobOpening.title,
      department: current.jobOpening.department,
      classification:
        current.jobOpening.workerClassification === "INDEPENDENT_CONTRACTOR"
          ? "INDEPENDENT_CONTRACTOR"
          : "W2_EMPLOYEE",
      hireDate: new Date(),
      status: "PENDING_ONBOARDING",
    },
  });

  const checklist = await prisma.onboardingChecklist.create({
    data: { employeeId: employee.id },
  });
  await prisma.onboardingStep.createMany({
    data: ONBOARDING_STEPS.map((key) => ({
      checklistId: checklist.id,
      key,
    })),
  });
  await prisma.newHireReport.create({
    data: { employeeId: employee.id, dateHired: new Date() },
  });

  const linkedDocumentIds = await relinkApplicantDocuments({
    applicationId: current.id,
    employeeId: employee.id,
  });

  let userId = current.applicant.userId ?? employee.userId;
  if (userId) {
    await promoteApplicantUserToEmployee(userId, args.actorId);
    if (!employee.userId) {
      await prisma.employee.update({ where: { id: employee.id }, data: { userId } });
    }
  } else {
    const email = current.applicant.email.trim().toLowerCase();
    if (email) {
      const provisioned = await provisionEmployeePortalUser({
        employeeId: employee.id,
        email,
        firstName: current.applicant.legalFirstName,
        lastName: current.applicant.legalLastName,
        phone: current.applicant.phone,
        roleKey: "EMPLOYEE",
        actorId: args.actorId,
      });
      if (!("error" in provisioned)) {
        userId = provisioned.userId;
        if (!current.applicant.userId) {
          await prisma.applicant.update({
            where: { id: current.applicantId },
            data: { userId: provisioned.userId },
          });
        }
        if (!provisioned.linked) {
          await issueActivation(
            provisioned.userId,
            email,
            `${current.applicant.legalFirstName} ${current.applicant.legalLastName}`,
          );
        }
      }
    }
  }

  await recordConversion({
    applicationId: current.id,
    applicantId: current.applicantId,
    employeeId: employee.id,
    userId,
    convertedById: args.actorId,
    documentIds: linkedDocumentIds,
  });

  await writeAuditLog({
    actorId: args.actorId,
    actorEmail: args.actorEmail,
    action: "applicant.converted_to_employee",
    targetType: "application",
    targetId: current.id,
    metadata: {
      employeeId: employee.id,
      applicantId: current.applicantId,
      documentIds: linkedDocumentIds,
    },
  });

  return {
    ok: true,
    employeeId: employee.id,
    created: true,
    linkedDocumentIds,
  };
}

async function relinkApplicantDocuments(args: { applicationId: string; employeeId: string }) {
  const links = await prisma.applicantDocument.findMany({
    where: { applicationId: args.applicationId },
    include: { document: true },
  });
  const documentIds: string[] = [];
  for (const link of links) {
    documentIds.push(link.documentId);
    const existing = await prisma.employeeDocument.findFirst({
      where: { employeeId: args.employeeId, documentId: link.documentId },
    });
    if (!existing) {
      await prisma.employeeDocument.create({
        data: { employeeId: args.employeeId, documentId: link.documentId },
      });
    }
    const domain = policyDomainFor(link.document.category, link.document.documentType);
    const nextCategory =
      link.document.category === "APPLICANT" || link.document.category === "APPLICANT_DOCUMENTS"
        ? "HR"
        : link.document.category;
    await prisma.managedDocument.update({
      where: { id: link.documentId },
      data: {
        ownerEntity: "EMPLOYEE",
        ownerId: args.employeeId,
        policyDomain: domain === "APPLICANT" ? "HR" : domain,
        category: nextCategory,
      },
    });
  }
  return documentIds;
}

async function recordConversion(args: {
  applicationId: string;
  applicantId: string;
  employeeId: string;
  userId?: string | null;
  convertedById: string;
  documentIds: string[];
}) {
  await prisma.applicantEmployeeConversion.upsert({
    where: { applicationId: args.applicationId },
    create: {
      applicationId: args.applicationId,
      applicantId: args.applicantId,
      employeeId: args.employeeId,
      userId: args.userId ?? null,
      convertedById: args.convertedById,
      documentIds: args.documentIds,
    },
    update: {
      employeeId: args.employeeId,
      userId: args.userId ?? null,
      documentIds: args.documentIds,
    },
  });
}

async function promoteApplicantUserToEmployee(userId: string, actorId: string) {
  const employeeRole = await prisma.role.findUnique({ where: { key: "EMPLOYEE" } });
  if (!employeeRole) return;
  const existing = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId, roleId: employeeRole.id } },
  });
  if (!existing) {
    await prisma.userRole.create({
      data: { userId, roleId: employeeRole.id, createdBy: actorId },
    });
  }
}
