import { createHash } from "node:crypto";
import { appOrigin } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";
import { createActivationToken } from "@/lib/ids";

export const RESET_PASSWORD_PATH = "/reset-password";
export const RESET_PASSWORD_PREFIX = "password-reset:";
export const BETTER_AUTH_RESET_PREFIX = "reset-password:";
export const RESET_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000;

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordResetIdentifier(token: string) {
  return `${RESET_PASSWORD_PREFIX}${hashPasswordResetToken(token)}`;
}

export function buildPasswordResetUrl(token: string, origin = appOrigin()) {
  const url = new URL(RESET_PASSWORD_PATH, `${origin.replace(/\/$/, "")}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

function normalizeResetToken(token: string) {
  let value = token.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep the raw token if it is not URI-encoded
  }
  if (value.startsWith(RESET_PASSWORD_PREFIX)) return value.slice(RESET_PASSWORD_PREFIX.length);
  if (value.startsWith(BETTER_AUTH_RESET_PREFIX)) return value.slice(BETTER_AUTH_RESET_PREFIX.length);
  return value;
}

function resetLookupIdentifiers(token: string) {
  const value = normalizeResetToken(token);
  if (!value) return [];
  return [
    passwordResetIdentifier(value),
    `${RESET_PASSWORD_PREFIX}${value}`,
    `${BETTER_AUTH_RESET_PREFIX}${value}`,
    createHash("sha256").update(`${BETTER_AUTH_RESET_PREFIX}${value}`).digest("base64url"),
  ];
}

export async function invalidatePasswordResetTokens(userId: string) {
  await prisma.verification.deleteMany({
    where: {
      value: userId,
      OR: [
        { identifier: { startsWith: RESET_PASSWORD_PREFIX } },
        { identifier: { startsWith: BETTER_AUTH_RESET_PREFIX } },
      ],
    },
  });
}

export async function issuePasswordReset(userId: string, email: string) {
  const recipient = email.trim().toLowerCase();
  if (!recipient) return { emailSent: false as const };

  await invalidatePasswordResetTokens(userId);
  const token = createActivationToken();
  const expiresAt = new Date(Date.now() + RESET_PASSWORD_TTL_MS);
  await prisma.verification.create({
    data: {
      identifier: passwordResetIdentifier(token),
      value: userId,
      expiresAt,
    },
  });

  const url = buildPasswordResetUrl(token);
  try {
    const result = await sendTransactionalEmail({
      to: recipient,
      subject: "Reset your Safeway Couriers portal password",
      html: `<p>We received a request to reset your Safeway Couriers portal password.</p>
<p><a href="${url}">Reset password</a></p>
<p>This link expires in 24 hours. If you did not request this, you can ignore this email.</p>`,
    });
    if (!result?.id || result.id === "dev-email") return { emailSent: false as const };
    return { emailSent: true as const };
  } catch {
    return { emailSent: false as const };
  }
}

export async function resolvePasswordResetToken(token: string) {
  const identifiers = resetLookupIdentifiers(token);
  if (!identifiers.length) return null;
  const row = await prisma.verification.findFirst({
    where: { identifier: { in: identifiers } },
  });
  if (!row || row.expiresAt < new Date()) return null;
  return { id: row.id, userId: row.value };
}

export async function consumePasswordResetToken(token: string) {
  const row = await resolvePasswordResetToken(token);
  if (!row) return null;
  await prisma.verification.delete({ where: { id: row.id } });
  return row.userId;
}
