import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  verification: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  user: { update: vi.fn() },
}));

const sendTransactionalEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/email", () => ({ sendTransactionalEmail }));

import {
  ACTIVATION_PATH,
  activationIdentifier,
  buildActivationUrl,
  consumeActivationToken,
  hashActivationToken,
  invalidateActivationTokens,
  issueActivation,
} from "@/lib/activation";
import { createActivationToken } from "@/lib/ids";

describe("activation tokens", () => {
  beforeEach(() => {
    prisma.verification.deleteMany.mockReset();
    prisma.verification.create.mockReset();
    prisma.verification.findFirst.mockReset();
    prisma.verification.delete.mockReset();
    prisma.user.update.mockReset();
    sendTransactionalEmail.mockReset();
    process.env.BETTER_AUTH_URL = "https://portal.safewaycouriers.com";
  });

  it("hashes tokens instead of storing the raw value", () => {
    const token = createActivationToken();
    expect(hashActivationToken(token)).not.toBe(token);
    expect(activationIdentifier(token)).toBe(`activation:${hashActivationToken(token)}`);
    expect(activationIdentifier(token)).not.toContain(token);
  });

  it("builds the production activate-account URL", () => {
    const token = "abc123";
    expect(buildActivationUrl(token, "https://portal.safewaycouriers.com")).toBe(
      "https://portal.safewaycouriers.com/activate-account?token=abc123",
    );
    expect(ACTIVATION_PATH).toBe("/activate-account");
  });

  it("invalidates previous tokens, emails the recipient, and does not return the token", async () => {
    sendTransactionalEmail.mockResolvedValue({ id: "email_456" });
    prisma.verification.deleteMany.mockResolvedValue({ count: 1 });
    prisma.verification.create.mockResolvedValue({ id: "ver_1" });
    prisma.user.update.mockResolvedValue({});

    const result = await issueActivation("user_1", "New.Employee@example.com", "Alex Employee");

    expect(prisma.verification.deleteMany).toHaveBeenCalledWith({
      where: { value: "user_1", identifier: { startsWith: "activation:" } },
    });
    expect(prisma.verification.create).toHaveBeenCalledTimes(1);
    const stored = prisma.verification.create.mock.calls[0][0].data.identifier as string;
    expect(stored.startsWith("activation:")).toBe(true);
    expect(stored).not.toContain("user_1");
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new.employee@example.com",
        subject: "Activate your Safeway Couriers portal account",
      }),
    );
    const html = String(sendTransactionalEmail.mock.calls[0][0].html);
    expect(html).toContain("https://portal.safewaycouriers.com/activate-account?token=");
    expect(html).not.toMatch(/temporary password/i);
    expect(result).toEqual({ emailSent: true });
    expect(result).not.toHaveProperty("url");
  });

  it("returns emailSent false when the recipient is missing", async () => {
    const result = await issueActivation("user_1", "  ", "Alex");
    expect(result).toEqual({ emailSent: false });
    expect(prisma.verification.create).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("keeps the account when Resend fails", async () => {
    sendTransactionalEmail.mockRejectedValue(new Error("provider down"));
    prisma.verification.deleteMany.mockResolvedValue({ count: 0 });
    prisma.verification.create.mockResolvedValue({ id: "ver_1" });
    prisma.user.update.mockResolvedValue({});
    const result = await issueActivation("user_1", "new.employee@example.com", "Alex");
    expect(result).toEqual({ emailSent: false });
    expect(prisma.verification.create).toHaveBeenCalled();
  });

  it("consumes a valid hashed token once", async () => {
    const token = "live-token";
    prisma.verification.findFirst.mockResolvedValue({
      id: "ver_1",
      value: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.verification.delete.mockResolvedValue({});
    await expect(consumeActivationToken(token)).resolves.toBe("user_1");
    expect(prisma.verification.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ identifier: activationIdentifier(token) }, { identifier: `activation:${token}` }],
      },
    });
    expect(prisma.verification.delete).toHaveBeenCalledWith({ where: { id: "ver_1" } });
  });

  it("rejects invalid, expired, and reused tokens", async () => {
    prisma.verification.findFirst.mockResolvedValue(null);
    await expect(consumeActivationToken("missing")).resolves.toBeNull();

    prisma.verification.findFirst.mockResolvedValue({
      id: "ver_expired",
      value: "user_1",
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(consumeActivationToken("expired-token")).resolves.toBeNull();
    expect(prisma.verification.delete).not.toHaveBeenCalled();

    prisma.verification.findFirst.mockResolvedValueOnce({
      id: "ver_used",
      value: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.verification.delete.mockResolvedValueOnce({});
    await expect(consumeActivationToken("used-once")).resolves.toBe("user_1");
    prisma.verification.findFirst.mockResolvedValueOnce(null);
    await expect(consumeActivationToken("used-once")).resolves.toBeNull();
  });

  it("invalidates all prior activation tokens for a user", async () => {
    await invalidateActivationTokens("user_1");
    expect(prisma.verification.deleteMany).toHaveBeenCalledWith({
      where: { value: "user_1", identifier: { startsWith: "activation:" } },
    });
  });
});
