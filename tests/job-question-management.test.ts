import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("job application question management", () => {
  it("wires the editor into the job detail page", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/jobs/[jobId]/page.tsx"),
      "utf8",
    );
    expect(page).toContain("JobQuestionEditor");
    expect(page).toContain("_count: { select: { answers: true } }");
  });

  it("protects historical applicant answers from question deletion", () => {
    const actions = readFileSync(
      path.join(process.cwd(), "app/(portal)/dashboard/jobs/actions.ts"),
      "utf8",
    );
    expect(actions).toContain("question._count.answers > 0");
    expect(actions).toContain("cannot be deleted because that would erase application history");
  });

  it("refreshes edited questions without requiring a manual browser refresh", () => {
    const editor = readFileSync(
      path.join(process.cwd(), "components/portal/JobQuestionEditor.tsx"),
      "utf8",
    );
    expect(editor).toContain("router.refresh()");
    expect(editor).not.toContain("window.location.reload()");
  });
});
