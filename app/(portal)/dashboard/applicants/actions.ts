"use server";

import { revalidatePath } from "next/cache";
import { issueActivation } from "@/lib/activation";
import {
  issueCandidateOnboardingLink,
  revokeCandidateOnboardingLinks,
} from "@/lib/candidate-onboarding";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { nextScopedId } from "@/lib/ids";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { provisionEmployeePortalUser } from "@/lib/portal-account";
import { requirePermission } from "@/lib/rbac";
import {
  businessLocalToUtc,
  formatBusinessDateTime,
} from "@/lib/workforce-time";
import type { ApplicationStatus, InterviewStatus } from "@prisma/client";

export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
  const ctx = await requirePermission("applicants.edit");
  const current = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      applicant: true,
      jobOpening: true,
      employee: true,
      documents: { include: { document: true } },
    },
  });
  if (!current) return { error: "Application not found." };

  await prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });
  await prisma.applicantStatusHistory.create({
    data: {
      applicationId,
      fromStatus: current.status,
      toStatus: status,
      changedBy: ctx.user.id,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "applicant.status.changed",
    targetType: "application",
    targetId: applicationId,
    metadata: { from: current.status, to: status },
  });

  if (status === "CONDITIONAL_OFFER" && current.status !== "CONDITIONAL_OFFER") {
    const onboarding = await issueCandidateOnboardingLink({
      applicationId: current.id,
      email: current.applicant.email,
      name: current.applicant.preferredName || current.applicant.legalFirstName,
    });
    await prisma.applicationCommunication.create({
      data: {
        applicationId: current.id,
        channel: "EMAIL",
        subject: "Conditional offer: upload your Safeway Couriers documents",
        body: onboarding.emailSent
          ? `Secure onboarding link sent to ${current.applicant.email}. Expires ${onboarding.expiresAt.toISOString()}.`
          : `Secure onboarding link was created for ${current.applicant.email}, but the email provider did not confirm delivery.`,
        direction: "OUTBOUND",
        createdBy: ctx.user.id,
      },
    });
    await writeAuditLog({
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: "applicant.conditional_offer_documents.issued",
      targetType: "application",
      targetId: current.id,
      metadata: { emailSent: onboarding.emailSent, expiresAt: onboarding.expiresAt.toISOString() },
    });
  }

  if (["HIRED", "WITHDRAWN", "NOT_SELECTED", "POSITION_FILLED"].includes(status)) {
    await revokeCandidateOnboardingLinks(current.id);
  }

  if (status === "HIRED" && !current.employee) {
    const employee = await prisma.employee.create({
      data: {
        employeeNumber: await nextScopedId("EMP"),
        applicationId: current.id,
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

    const transferableDocuments = current.documents.filter(
      ({ document }) =>
        document.lifecycleStatus !== "ARCHIVED" &&
        document.lifecycleStatus !== "REJECTED" &&
        document.verificationStatus !== "REJECTED",
    );
    if (transferableDocuments.length) {
      await prisma.employeeDocument.createMany({
        data: transferableDocuments.map(({ documentId }) => ({
          employeeId: employee.id,
          documentId,
        })),
      });
    }
    const email = current.applicant.email.trim().toLowerCase();
    if (email) {
      const provisioned = await provisionEmployeePortalUser({
        employeeId: employee.id,
        email,
        firstName: current.applicant.legalFirstName,
        lastName: current.applicant.legalLastName,
        phone: current.applicant.phone,
        roleKey: "EMPLOYEE",
        actorId: ctx.user.id,
      });
      if (!("error" in provisioned)) {
        await issueActivation(
          provisioned.userId,
          email,
          `${current.applicant.legalFirstName} ${current.applicant.legalLastName}`,
        );
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/applicants");
  revalidatePath(`/dashboard/applicants/${applicationId}`);
  return { ok: true };
}

export async function addApplicationNote(applicationId: string, formData: FormData) {
  const ctx = await requirePermission("applicants.notes.view");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await prisma.applicationNote.create({
    data: { applicationId, authorId: ctx.user.id, body },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "applicant.note.added",
    targetType: "application",
    targetId: applicationId,
  });
  revalidatePath(`/dashboard/applicants/${applicationId}`);
}

export async function updateInterview(applicationId: string, formData: FormData) {
  const ctx = await requirePermission("applicants.edit");
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { applicant: true, jobOpening: true },
  });
  if (!application) return { error: "Application not found." };

  const scheduledAtValue = String(formData.get("scheduledAt") ?? "").trim();
  const scheduledAt = scheduledAtValue ? businessLocalToUtc(scheduledAtValue) : null;
  if (!scheduledAt) return { error: "Choose a valid interview date and time." };

  const location = String(formData.get("location") ?? "").trim() || null;
  const interviewer = String(formData.get("interviewer") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "SCHEDULED") as InterviewStatus;

  await prisma.interview.create({
    data: {
      applicationId,
      status,
      scheduledAt,
      location,
      interviewer,
      notes,
    },
  });
  await prisma.application.update({
    where: { id: applicationId },
    data: {
      interviewStatus: "SCHEDULED",
      status:
        application.status === "SUBMITTED" || application.status === "UNDER_REVIEW"
          ? "INTERVIEW_SCHEDULED"
          : application.status,
    },
  });

  const formattedDateTime = formatBusinessDateTime(scheduledAt);
  const subject = `Safeway Couriers interview scheduled — ${application.jobOpening.title}`;
  const detailLines = [
    `Date & time: ${formattedDateTime}`,
    location ? `Location / meeting link: ${location}` : null,
    interviewer ? `Interviewer: ${interviewer}` : null,
  ].filter(Boolean);

  let emailSent = false;
  try {
    await sendTransactionalEmail({
      to: application.applicant.email,
      subject,
      html: `<p>Hello ${application.applicant.preferredName || application.applicant.legalFirstName},</p>
<p>Your interview with Safeway Couriers for <strong>${application.jobOpening.title}</strong> has been scheduled.</p>
<p><strong>Date &amp; time:</strong> ${formattedDateTime}</p>
${location ? `<p><strong>Location / meeting link:</strong> ${location}</p>` : ""}
${interviewer ? `<p><strong>Interviewer:</strong> ${interviewer}</p>` : ""}
<p>If you need to request a change, please reply to this email or contact Safeway Couriers.</p>`,
    });
    emailSent = true;
  } catch {
    emailSent = false;
  }

  await prisma.applicationCommunication.create({
    data: {
      applicationId,
      channel: "EMAIL",
      subject,
      body: emailSent
        ? `Interview notice sent to ${application.applicant.email}. ${detailLines.join(" · ")}`
        : `Interview scheduled, but email delivery was not confirmed for ${application.applicant.email}. ${detailLines.join(" · ")}`,
      direction: "OUTBOUND",
      createdBy: ctx.user.id,
    },
  });

  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "applicant.interview.updated",
    targetType: "application",
    targetId: applicationId,
    metadata: {
      scheduledAt: scheduledAt.toISOString(),
      location,
      interviewer,
      emailSent,
    },
  });

  revalidatePath("/dashboard/applicants");
  revalidatePath(`/dashboard/applicants/${applicationId}`);
  return emailSent
    ? { ok: true as const }
    : { ok: true as const, warning: "Interview saved, but the email provider did not confirm delivery." };
}


export async function sendApplicantOnboardingLink(applicationId: string) {
  const ctx = await requirePermission("applicants.edit");
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { applicant: true },
  });
  if (!application) return { error: "Application not found." };
  if (!["CONDITIONAL_OFFER", "BACKGROUND_SCREENING", "ONBOARDING"].includes(application.status)) {
    return { error: "Move the candidate to conditional offer, background screening, or onboarding first." };
  }

  const result = await issueCandidateOnboardingLink({
    applicationId,
    email: application.applicant.email,
    name: application.applicant.preferredName || application.applicant.legalFirstName,
  });
  await prisma.applicationCommunication.create({
    data: {
      applicationId,
      channel: "EMAIL",
      subject: "Conditional offer: upload your Safeway Couriers documents",
      body: result.emailSent
        ? `Secure onboarding link sent to ${application.applicant.email}. Expires ${result.expiresAt.toISOString()}.`
        : `Secure onboarding link was created for ${application.applicant.email}, but the email provider did not confirm delivery.`,
      direction: "OUTBOUND",
      createdBy: ctx.user.id,
    },
  });
  await writeAuditLog({
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "applicant.onboarding_link.resent",
    targetType: "application",
    targetId: applicationId,
    metadata: { emailSent: result.emailSent, expiresAt: result.expiresAt.toISOString() },
  });
  revalidatePath(`/dashboard/applicants/${applicationId}`);
  return result.emailSent
    ? { ok: true as const }
    : { error: "The secure onboarding link was created, but the email could not be sent." };
}
