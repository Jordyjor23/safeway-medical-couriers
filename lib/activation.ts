import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { createActivationToken } from "@/lib/ids";

function siteOrigin() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

export async function issueActivation(userId: string, email: string, name: string) {
  const token = createActivationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.verification.create({
    data: {
      identifier: `activation:${token}`,
      value: userId,
      expiresAt,
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { activationExpiresAt: expiresAt },
  });
  const url = `${siteOrigin()}/activate?token=${token}`;
  await sendTransactionalEmail({
    to: email,
    subject: "Activate your Safeway Couriers portal account",
    html: `<p>Hello ${name},</p>
<p>An account was created for you on the Safeway Couriers portal.</p>
<p><a href="${url}">Activate your account and set a password</a></p>
<p>This link expires in 7 days. If you did not expect this message, ignore it.</p>`,
  });
  return { url, expiresAt };
}

export async function consumeActivationToken(token: string) {
  const row = await prisma.verification.findFirst({
    where: { identifier: `activation:${token}` },
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
