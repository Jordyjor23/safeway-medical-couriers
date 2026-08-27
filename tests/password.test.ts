import { describe, expect, it } from "vitest";
import { isStrongPassword, passwordIssues } from "@/lib/password";

describe("password policy", () => {
  it("rejects short or simple passwords", () => {
    expect(isStrongPassword("Password1")).toBe(false);
    expect(passwordIssues("short")).toContain("Use at least 12 characters.");
  });

  it("accepts a strong password", () => {
    expect(isStrongPassword("Safeway!Portal12")).toBe(true);
  });
});
