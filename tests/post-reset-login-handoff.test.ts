import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("post-reset login handoff", () => {
  it("carries the account email into the login redirect after a successful reset", () => {
    const actions = readFileSync(path.join(process.cwd(), "app/(auth)/reset-password/actions.ts"), "utf8");
    expect(actions).toContain('new URLSearchParams({ reset: "1", identifier: user.email })');
    expect(actions).toContain('params.toString()');
  });

  it("prefills and locks the reset account identifier on the login form", () => {
    const login = readFileSync(path.join(process.cwd(), "components/auth/LoginForm.tsx"), "utf8");
    expect(login).toContain('const resetIdentifier = searchParams.get("identifier")?.trim() ?? ""');
    expect(login).toContain("defaultValue={resetIdentifier}");
    expect(login).toContain("readOnly={reset && Boolean(resetIdentifier)}");
    expect(login).toContain("Your account email is filled in below");
  });
});
