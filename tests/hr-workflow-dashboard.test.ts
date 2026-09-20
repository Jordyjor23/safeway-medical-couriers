import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("expanded HR workflow dashboard", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/(portal)/dashboard/hr/page.tsx"),
    "utf8",
  );

  it("shows the full nine-stage HR workflow", () => {
    expect(source).toContain("9 stages");
    for (const label of [
      "Applicant review",
      "Interview",
      "Conditional offer",
      "Background screening",
      "Candidate onboarding",
      "Employee record created",
      "HR & document review",
      "Ready for assignment",
      "Active",
    ]) {
      expect(source).toContain(label);
    }
  });

  it("uses live applicant, document, employee, and readiness counts", () => {
    expect(source).toContain('countFor("SUBMITTED") + countFor("UNDER_REVIEW")');
    expect(source).toContain('countFor("INTERVIEW_REQUESTED") + countFor("INTERVIEW_SCHEDULED")');
    expect(source).toContain('key: "READY_FOR_ASSIGNMENT"');
    expect(source).toContain('status: { in: ["COMPLETED", "NOT_APPLICABLE"] }');
    expect(source).toContain("pendingDocumentReview");
    expect(source).toContain("activeEmployees");
  });
});
