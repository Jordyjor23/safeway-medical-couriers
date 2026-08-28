import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailDeliveryError, emailFromAddress, sendTransactionalEmail } from "@/lib/email";

const KEYS = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

describe("transactional email", () => {
  const previous: Record<string, string | undefined> = {};
  const fetchMock = vi.fn();

  beforeEach(() => {
    for (const key of KEYS) previous[key] = process.env[key];
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Safeway Couriers <noreply@safewaycouriers.com>";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it("posts the recipient and EMAIL_FROM to Resend", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "email_123" }),
    });
    const result = await sendTransactionalEmail({
      to: "new.employee@example.com",
      subject: "Activate your Safeway Couriers portal account",
      html: "<p>Activate</p>",
    });
    expect(emailFromAddress()).toBe("Safeway Couriers <noreply@safewaycouriers.com>");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    expect(JSON.parse(init.body)).toMatchObject({
      from: "Safeway Couriers <noreply@safewaycouriers.com>",
      to: ["new.employee@example.com"],
      subject: "Activate your Safeway Couriers portal account",
    });
    expect(result).toEqual({ id: "email_123" });
  });

  it("fails without exposing provider errors when Resend rejects the request", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        name: "validation_error",
        message: "secret provider detail",
      }),
    });
    const error = await sendTransactionalEmail({
      to: "new.employee@example.com",
      subject: "Activate",
      html: "<p>Activate</p>",
    }).catch((value) => value);
    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect(String(error)).not.toContain("secret provider detail");
  });

  it("fails when the recipient or API key is missing", async () => {
    await expect(
      sendTransactionalEmail({ to: "  ", subject: "Activate", html: "<p>Activate</p>" }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(fetchMock).not.toHaveBeenCalled();

    delete process.env.RESEND_API_KEY;
    await expect(
      sendTransactionalEmail({
        to: "new.employee@example.com",
        subject: "Activate",
        html: "<p>Activate</p>",
      }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
