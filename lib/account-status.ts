import type { AccountStatus } from "@prisma/client";

const BLOCKED: AccountStatus[] = ["SUSPENDED", "INACTIVE", "TERMINATED"];

export const MAX_FAILED_LOGINS = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

export function accountAllowsLogin(user: {
  disabled?: boolean | null;
  accountStatus?: AccountStatus | string | null;
  activationExpiresAt?: Date | null;
  lockedUntil?: Date | null;
}) {
  if (user.disabled) return false;
  if (user.lockedUntil && user.lockedUntil > new Date()) return false;
  const status = user.accountStatus ?? "ACTIVE";
  if (status === "PENDING_ACTIVATION") {
    if (user.activationExpiresAt && user.activationExpiresAt < new Date()) return false;
    return true;
  }
  if (status === "LOCKED") {
    if (!user.lockedUntil) return false;
    return user.lockedUntil <= new Date();
  }
  if (BLOCKED.includes(status as AccountStatus)) return false;
  return status === "ACTIVE";
}

export function nextFailedLoginState(failedLoginCount: number, accountStatus?: string | null) {
  const failed = failedLoginCount + 1;
  if (failed < MAX_FAILED_LOGINS) {
    return { failedLoginCount: failed };
  }
  return {
    failedLoginCount: failed,
    lockedUntil: new Date(Date.now() + LOGIN_LOCK_MS),
    ...(accountStatus === "ACTIVE" ? { accountStatus: "LOCKED" as const } : {}),
  };
}

export function accountAllowsPasswordReset(user: {
  disabled?: boolean | null;
  accountStatus?: AccountStatus | string | null;
}) {
  if (user.disabled) return false;
  const status = user.accountStatus ?? "ACTIVE";
  return status === "ACTIVE" || status === "LOCKED" || status === "PENDING_ACTIVATION";
}

export function isTerminatedStatus(status?: string | null) {
  return status === "TERMINATED" || status === "INACTIVE" || status === "SUSPENDED";
}
