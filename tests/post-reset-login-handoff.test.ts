import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("post-reset login handoff", () => {
  it("automatically signs in with the canonical account email after a successful reset", () => {
    const actions = readFileSync(path.join(process.cwd(), "app/(auth)/reset-password/actions.ts"), "utf8");
    expect(actions).toContain("auth.api.signInEmail");
    expect(actions).toContain("email: user.email");
    expect(actions).toContain('redirect("/portal")');
    expect(actions).toContain('auto: "failed"');
  });

  it("prefills but keeps the reset account identifier editable on the login form", () => {
    const login = readFileSync(path.join(process.cwd(), "components/auth/LoginForm.tsx"), "utf8");
    expect(login).toContain('const resetIdentifier = searchParams.get("identifier")?.trim() ?? ""');
    expect(login).toContain("defaultValue={resetIdentifier}");
    expect(login).not.toContain("readOnly={reset && Boolean(resetIdentifier)}");
    expect(login).toContain("You can also replace it with your username");
    expect(login).toContain("Automatic sign-in could not be completed");
  });
  it("explains one-time reset link behavior without consuming on page load", () => {
    const page = readFileSync(
      path.join(process.cwd(), "app/(auth)/reset-password/page.tsx"),
      "utf8",
    );
    expect(page).toContain("resolvePasswordResetToken(token)");
    expect(page).toContain("Opening a reset link does not use it");
    expect(page).toContain("a newer reset email was requested");
  });
});
