import { hashPassword } from "better-auth/crypto";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { allocateUsername } from "@/lib/ids";
import { isStrongPassword, passwordIssues } from "@/lib/password";
import { CREDENTIAL_ISSUER, CREDENTIAL_PROVIDER_ID } from "@/lib/portal-account";

export async function registerApplicantAccount(input: {
  email: string;
  password: string;
  legalFirstName: string;
  legalLastName: string;
  phone?: string;
  city?: string;
  state?: string;
  zip?: string;
  preferredName?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const first = input.legalFirstName.trim();
  const last = input.legalLastName.trim();
  if (!email || !first || !last) {
    return { error: "Name and email are required." };
  }
  if (!isStrongPassword(input.password)) {
    return { error: passwordIssues(input.password)[0] ?? "Choose a stronger password." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "An account with that email already exists. Sign in instead." };
  }

  const existingApplicant = await prisma.applicant.findUnique({ where: { email } });
  const role = await prisma.role.findUnique({ where: { key: "APPLICANT" } });
  if (!role) {
    return { error: "Applicant accounts are not configured yet." };
  }

  const username = await allocateUsername(first, last);
  const user = await prisma.user.create({
    data: {
      name: `${first} ${last}`.trim(),
      firstName: first,
      lastName: last,
      email,
      username,
      phone: input.phone?.trim() || null,
      emailVerified: false,
      accountStatus: "ACTIVE",
      mustChangePassword: false,
      disabled: false,
    },
  });

  await prisma.account.create({
    data: {
      issuer: CREDENTIAL_ISSUER,
      accountId: user.id,
      providerId: CREDENTIAL_PROVIDER_ID,
      userId: user.id,
      password: await hashPassword(input.password),
    },
  });

  await prisma.userRole.create({
    data: { userId: user.id, roleId: role.id },
  });

  const applicant = existingApplicant
    ? await prisma.applicant.update({
        where: { id: existingApplicant.id },
        data: {
          userId: user.id,
          legalFirstName: first,
          legalLastName: last,
          preferredName: input.preferredName?.trim() || existingApplicant.preferredName,
          phone: input.phone?.trim() || existingApplicant.phone,
          city: input.city?.trim() || existingApplicant.city,
          state: input.state?.trim() || existingApplicant.state,
          zip: input.zip?.trim() || existingApplicant.zip,
        },
      })
    : await prisma.applicant.create({
        data: {
          userId: user.id,
          legalFirstName: first,
          legalLastName: last,
          preferredName: input.preferredName?.trim() || null,
          email,
          phone: input.phone?.trim() || "",
          city: input.city?.trim() || "",
          state: input.state?.trim() || "",
          zip: input.zip?.trim() || "",
        },
      });

  await writeAuditLog({
    actorId: user.id,
    actorEmail: email,
    action: "applicant.registered",
    targetType: "applicant",
    targetId: applicant.id,
  });

  return { userId: user.id, applicantId: applicant.id, email, username };
}

export async function ensureApplicantProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { applicant: true, roles: { include: { role: true } } },
  });
  if (!user) return null;
  if (user.applicant) return user.applicant;
  const role = await prisma.role.findUnique({ where: { key: "APPLICANT" } });
  if (role && !user.roles.some((assignment) => assignment.role.key === "APPLICANT")) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  return prisma.applicant.create({
    data: {
      userId: user.id,
      legalFirstName: user.firstName || user.name.split(" ")[0] || "Applicant",
      legalLastName: user.lastName || user.name.split(" ").slice(1).join(" ") || "Account",
      email: user.email,
      phone: user.phone || "",
      city: "",
      state: "",
      zip: "",
    },
  });
}
