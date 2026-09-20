import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_EMAIL_FROM, emailFromAddress } from "@/lib/email";

const previous = process.env.EMAIL_FROM;

afterEach(() => {
  if (previous === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = previous;
});

describe("transactional email sender configuration", () => {
  it("uses the verified Safeway sender when EMAIL_FROM is missing", () => {
    delete process.env.EMAIL_FROM;
    expect(emailFromAddress()).toBe(DEFAULT_EMAIL_FROM);
  });

  it("replaces the unverified root-domain sender with the verified mail subdomain", () => {
    process.env.EMAIL_FROM = "Safeway Couriers <medworld@safewaycouriers.com>";
    expect(emailFromAddress()).toBe(DEFAULT_EMAIL_FROM);
  });

  it("preserves a verified mail.safewaycouriers.com sender", () => {
    process.env.EMAIL_FROM = "Safeway Couriers <noreply@mail.safewaycouriers.com>";
    expect(emailFromAddress()).toBe(process.env.EMAIL_FROM);
  });

  it("preserves explicitly configured non-Safeway senders", () => {
    process.env.EMAIL_FROM = "Example <noreply@example.com>";
    expect(emailFromAddress()).toBe(process.env.EMAIL_FROM);
  });
});
