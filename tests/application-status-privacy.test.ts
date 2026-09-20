import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("public application status privacy", () => {
  it("does not put applicant email into the confirmation URL", () => {
    const form = readFileSync(
      path.join(process.cwd(), "components/careers/ApplicationForm.tsx"),
      "utf8",
    );
    expect(form).toContain("/careers/apply/confirmation/");
    expect(form).not.toContain("?email=");
  });

  it("does not query or render applicant PII on the confirmation page", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/(marketing)/careers/apply/confirmation/[trackingNumber]/page.tsx"),
      "utf8",
    );
    expect(page).not.toContain("prisma.application");
    expect(page).not.toContain("applicantName");
    expect(page).not.toContain("searchParams");
  });

  it("returns only the minimum public status fields and disables caching", () => {
    const route = readFileSync(
      path.join(process.cwd(), "app/api/careers/applications/route.ts"),
      "utf8",
    );
    const getHandler = route.slice(route.indexOf("export async function GET"));
    expect(getHandler).toContain("trackingNumber: application.trackingNumber");
    expect(getHandler).toContain("position: application.jobOpening.title");
    expect(getHandler).toContain("statusLabel: publicStatusLabel(application.status)");
    expect(getHandler).toContain('"Cache-Control": "no-store"');
    expect(getHandler).not.toContain("publicApplicationView(application)");
  });
});
