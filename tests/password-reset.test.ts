import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  verification: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));

import {
  RESET_PASSWORD_PREFIX,
  buildPasswordResetUrl,
  consumePasswordResetToken,
  resetPasswordIdentifier,
  resolvePasswordResetToken,
} from "@/lib/password-reset";

describe("password reset tokens", () => {
  beforeEach(() => {
    prisma.verification.findFirst.mockReset();
    prisma.verification.delete.mockReset();
  });

  it("builds a query-string reset URL", () => {
    expect(buildPasswordResetUrl("abc123", "https://portal.safewaycouriers.com")).toBe(
      "https://portal.safewaycouriers.com/reset-password?token=abc123",
    );
    expect(resetPasswordIdentifier("abc123")).toBe(`${RESET_PASSWORD_PREFIX}abc123`);
    expect(resetPasswordIdentifier("reset-password:abc123")).toBe("reset-password:abc123");
  });

  it("resolves a live Better Auth reset token without consuming it", async () => {
    prisma.verification.findFirst.mockResolvedValue({
      id: "ver_1",
      value: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(resolvePasswordResetToken("abc123")).resolves.toEqual({
      id: "ver_1",
      userId: "user_1",
    });
    expect(prisma.verification.findFirst).toHaveBeenCalledWith({
      where: { identifier: "reset-password:abc123" },
    });
    expect(prisma.verification.delete).not.toHaveBeenCalled();
  });

  it("consumes a valid token once and rejects expired ones", async () => {
    prisma.verification.findFirst.mockResolvedValueOnce({
      id: "ver_1",
      value: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.verification.delete.mockResolvedValueOnce({});
    await expect(consumePasswordResetToken("abc123")).resolves.toBe("user_1");

    prisma.verification.findFirst.mockResolvedValueOnce({
      id: "ver_expired",
      value: "user_1",
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(resolvePasswordResetToken("old")).resolves.toBeNull();
  });
});
