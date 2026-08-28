import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  account: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: { update: vi.fn() },
  session: { deleteMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
}));

import {
  CREDENTIAL_ISSUER,
  CREDENTIAL_PROVIDER_ID,
  attachCredentialAccount,
  credentialIssuer,
  setCredentialPassword,
} from "@/lib/portal-account";

describe("credential accounts", () => {
  beforeEach(() => {
    prisma.account.findFirst.mockReset();
    prisma.account.findMany.mockReset();
    prisma.account.create.mockReset();
    prisma.account.update.mockReset();
    prisma.account.deleteMany.mockReset();
    prisma.user.update.mockReset();
    prisma.session.deleteMany.mockReset();
  });

  it("uses Better Auth's local:credential issuer, not the app origin", async () => {
    prisma.account.findFirst.mockResolvedValue({ id: "acc_owner" });
    await expect(credentialIssuer()).resolves.toBe(CREDENTIAL_ISSUER);
    expect(CREDENTIAL_ISSUER).toBe("local:credential");
    expect(CREDENTIAL_PROVIDER_ID).toBe("credential");
  });

  it("creates a canonical credential account when none exists", async () => {
    prisma.account.findMany.mockResolvedValue([]);
    prisma.account.create.mockResolvedValue({ id: "acc_new" });
    prisma.user.update.mockResolvedValue({});
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });

    await setCredentialPassword("user_1", "Safeway!Portal12");

    expect(prisma.account.create).toHaveBeenCalledWith({
      data: {
        issuer: CREDENTIAL_ISSUER,
        accountId: "user_1",
        providerId: CREDENTIAL_PROVIDER_ID,
        userId: "user_1",
        password: "hashed:Safeway!Portal12",
      },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: expect.objectContaining({
        accountStatus: "ACTIVE",
        mustChangePassword: false,
        failedLoginCount: 0,
      }),
    });
  });

  it("rewrites a legacy origin-issuer account so Better Auth can verify the password", async () => {
    prisma.account.findMany.mockResolvedValue([
      {
        id: "acc_legacy",
        issuer: "https://portal.safewaycouriers.com",
        accountId: "user_1",
        providerId: "credential",
        userId: "user_1",
      },
    ]);
    prisma.account.update.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });

    await setCredentialPassword("user_1", "Safeway!Portal12");

    expect(prisma.account.create).not.toHaveBeenCalled();
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: "acc_legacy" },
      data: {
        issuer: CREDENTIAL_ISSUER,
        accountId: "user_1",
        password: "hashed:Safeway!Portal12",
      },
    });
  });

  it("attaches new staff accounts with the canonical issuer", async () => {
    prisma.account.create.mockResolvedValue({ id: "acc_staff" });
    await attachCredentialAccount("user_2", "https://portal.safewaycouriers.com");
    expect(prisma.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issuer: CREDENTIAL_ISSUER,
        accountId: "user_2",
        providerId: CREDENTIAL_PROVIDER_ID,
        userId: "user_2",
      }),
    });
  });
});
