import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resendState = vi.hoisted(() => ({
  send: vi.fn(),
  apiKey: "",
}));

vi.mock("resend", () => ({
  Resend: class {
    emails: { send: typeof resendState.send };
    constructor(apiKey: string) {
      resendState.apiKey = apiKey;
      this.emails = { send: resendState.send };
    }
  },
}));

import { EmailDeliveryError, emailFromAddress, sendTransactionalEmail } from "@/lib/email";

const KEYS = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

describe("transactional email", () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) previous[key] = process.env[key];
    resendState.send.mockReset();
    resendState.apiKey = "";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Safeway Couriers <noreply@safewaycouriers.com>";
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it("uses EMAIL_FROM and RESEND_API_KEY and passes the recipient", async () => {
    resendState.send.mockResolvedValue({ data: { id: "email_123" }, error: null });
    const result = await sendTransactionalEmail({
      to: "new.employee@example.com",
      subject: "Activate your Safeway Couriers portal account",
      html: "<p>Activate</p>",
    });
    expect(emailFromAddress()).toBe("Safeway Couriers <noreply@safewaycouriers.com>");
    expect(resendState.apiKey).toBe("re_test_key");
    expect(resendState.send).toHaveBeenCalledTimes(1);
    expect(resendState.send.mock.calls[0][0]).toMatchObject({
      from: "Safeway Couriers <noreply@safewaycouriers.com>",
      to: "new.employee@example.com",
      subject: "Activate your Safeway Couriers portal account",
    });
    expect(result).toMatchObject({ id: "email_123" });
  });

  it("fails without exposing provider errors when Resend returns an error", async () => {
    resendState.send.mockResolvedValue({ data: null, error: { message: "secret provider detail" } });
    const error = await sendTransactionalEmail({
      to: "new.employee@example.com",
      subject: "Activate",
      html: "<p>Activate</p>",
    }).catch((value) => value);
    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect(String(error)).not.toContain("secret provider detail");
  });

  it("fails when the recipient is missing", async () => {
    await expect(
      sendTransactionalEmail({ to: "  ", subject: "Activate", html: "<p>Activate</p>" }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(resendState.send).not.toHaveBeenCalled();
  });
});
