import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { assertNoForbiddenApplicationKeys, publicApplicationView } from "@/lib/application-schema";

describe("public application payload", () => {
  it("rejects forbidden keys", () => {
    expect(() => assertNoForbiddenApplicationKeys({ salary: "90000" })).toThrow();
    expect(() => assertNoForbiddenApplicationKeys({ legalFirstName: "Ada" })).not.toThrow();
  });

  it("does not expose internal ids or notes", () => {
    const view = publicApplicationView({
      trackingNumber: "SWC-2026-ABC123",
      status: "UNDER_REVIEW",
      submittedAt: new Date("2026-08-27T12:00:00Z"),
      applicant: { legalFirstName: "Ada", preferredName: null, legalLastName: "Lovelace" },
      jobOpening: { title: "Medical Courier" },
    });
    expect(view).not.toHaveProperty("id");
    expect(view).not.toHaveProperty("notes");
    expect(JSON.stringify(view)).not.toMatch(/uuid/i);
  });
});

describe("application form employment-law guards", () => {
  it("does not include prohibited questions", () => {
    const source = readFileSync(
      path.join(process.cwd(), "components/careers/ApplicationForm.tsx"),
      "utf8",
    );
    for (const term of ["social security", "date of birth", "current salary", "previous salary", "photograph", "marital status", "pregnancy", "childcare"]) {
      expect(source.toLowerCase()).not.toContain(term);
    }
    expect(source).not.toMatch(/name=["']ssn/i);
    expect(source).not.toMatch(/name=["']dateOfBirth/i);
  });
});
