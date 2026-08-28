import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  verification: {
    findFirst: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
}));

const sendTransactionalEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/email", () => ({ sendTransactionalEmail }));

import {
  BETTER_AUTH_RESET_PREFIX,
  RESET_PASSWORD_PREFIX,
  buildPasswordResetUrl,
  consumePasswordResetToken,
  hashPasswordResetToken,
  issuePasswordReset,
  passwordResetIdentifier,
  resolvePasswordResetToken,
} from "@/lib/password-reset";

describe("password reset tokens", () => {
  beforeEach(() => {
    prisma.verification.findFirst.mockReset();
    prisma.verification.delete.mockReset();
    prisma.verification.deleteMany.mockReset();
    prisma.verification.create.mockReset();
    sendTransactionalEmail.mockReset();
    process.env.BETTER_AUTH_URL = "https://portal.safewaycouriers.com";
  });

  it("hashes issued tokens instead of storing the raw value", () => {
    const token = "abc123";
    expect(passwordResetIdentifier(token)).toBe(`${RESET_PASSWORD_PREFIX}${hashPasswordResetToken(token)}`);
    expect(passwordResetIdentifier(token)).not.toContain(token);
    expect(BETTER_AUTH_RESET_PREFIX).toBe("reset-password:");
  });

  it("builds a query-string reset URL", () => {
    expect(buildPasswordResetUrl("abc123", "https://portal.safewaycouriers.com")).toBe(
      "https://portal.safewaycouriers.com/reset-password?token=abc123",
    );
  });

  it("emails a hashed-token link and does not return the token", async () => {
    sendTransactionalEmail.mockResolvedValue({ id: "email_reset" });
    prisma.verification.deleteMany.mockResolvedValue({ count: 0 });
    prisma.verification.create.mockResolvedValue({ id: "ver_1" });

    const result = await issuePasswordReset("user_1", "Owner@safewaycouriers.com");

    expect(result).toEqual({ emailSent: true });
    const stored = prisma.verification.create.mock.calls[0][0].data.identifier as string;
    expect(stored.startsWith(RESET_PASSWORD_PREFIX)).toBe(true);
    expect(stored).not.toContain("user_1");
    const html = String(sendTransactionalEmail.mock.calls[0][0].html);
    expect(html).toContain("https://portal.safewaycouriers.com/reset-password?token=");
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@safewaycouriers.com",
        subject: "Reset your Safeway Couriers portal password",
      }),
    );
  });

  it("resolves a live token without consuming it", async () => {
    prisma.verification.findFirst.mockResolvedValue({
      id: "ver_1",
      value: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(resolvePasswordResetToken("abc123")).resolves.toEqual({
      id: "ver_1",
      userId: "user_1",
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
