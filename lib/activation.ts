import { createHash } from "node:crypto";
import { appOrigin } from "@/lib/app-url";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { createActivationToken } from "@/lib/ids";

export const ACTIVATION_PATH = "/activate-account";
export const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const ACTIVATION_EMAIL_FAILED_MESSAGE =
  "Employee created, but activation email could not be sent. Use Resend Activation from User Management.";
export const ACTIVATION_RESEND_FAILED_MESSAGE =
  "Activation email could not be sent. Try again from User Management.";

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function activationIdentifier(token: string) {
  return `activation:${hashActivationToken(token)}`;
}

export function buildActivationUrl(token: string, origin = appOrigin()) {
  const url = new URL(ACTIVATION_PATH, `${origin.replace(/\/$/, "")}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export async function invalidateActivationTokens(userId: string) {
  await prisma.verification.deleteMany({
    where: { value: userId, identifier: { startsWith: "activation:" } },
  });
}

export async function issueActivation(userId: string, email: string, name: string) {
  const recipient = email.trim().toLowerCase();
  if (!recipient) {
    console.error("[email] activation email failed", { reason: "missing_recipient" });
    return { emailSent: false as const };
  }

  await invalidateActivationTokens(userId);
  const token = createActivationToken();
  const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
  await prisma.verification.create({
    data: {
      identifier: activationIdentifier(token),
      value: userId,
      expiresAt,
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: {
      activationExpiresAt: expiresAt,
      accountStatus: "PENDING_ACTIVATION",
      mustChangePassword: true,
      disabled: false,
    },
  });

  const url = buildActivationUrl(token);
  console.info("[email] activation email attempted", { to: recipient });
  try {
    const result = await sendTransactionalEmail({
      to: recipient,
      subject: "Activate your Safeway Couriers portal account",
      html: `<p>Hello ${escapeHtml(name)},</p>
<p>An account was created for you on the Safeway Couriers portal.</p>
<p><a href="${url}">Activate your account and set a password</a></p>
<p>This link expires in 7 days. If you did not expect this message, ignore it.</p>`,
    });
    console.info("[email] activation email successfully queued", {
      to: recipient,
      id: result?.id ?? null,
    });
    return { emailSent: true as const };
  } catch {
    console.error("[email] activation email failed", { to: recipient });
    return { emailSent: false as const };
  }
}

export async function consumeActivationToken(token: string) {
  const value = token.trim();
  if (!value) return null;
  const row = await prisma.verification.findFirst({
    where: {
      OR: [{ identifier: activationIdentifier(value) }, { identifier: `activation:${value}` }],
    },
  });
  if (!row || row.expiresAt < new Date()) return null;
  await prisma.verification.delete({ where: { id: row.id } });
  return row.value;
}

export async function revokeUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function recordAuthEvent(input: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await writeAuditLog({
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    action: input.action,
    targetType: "user",
    targetId: input.targetId ?? input.actorId,
    metadata: input.metadata,
  });
}
