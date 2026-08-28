import { prisma } from "@/lib/db";

export const RESET_PASSWORD_PREFIX = "reset-password:";

export function resetPasswordIdentifier(token: string) {
  let value = token.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep the raw token if it is not URI-encoded
  }
  if (!value) return "";
  return value.startsWith(RESET_PASSWORD_PREFIX) ? value : `${RESET_PASSWORD_PREFIX}${value}`;
}

export function buildPasswordResetUrl(token: string, origin: string) {
  const url = new URL("/reset-password", `${origin.replace(/\/$/, "")}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function resolvePasswordResetToken(token: string) {
  const identifier = resetPasswordIdentifier(token);
  if (!identifier) return null;
  const row = await prisma.verification.findFirst({
    where: { identifier },
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
