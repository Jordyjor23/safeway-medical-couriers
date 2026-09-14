import { expect, test } from "@playwright/test";
import { expectHealthyDocument, expectNotServerError } from "./helpers";

test.describe("health", { tag: "@smoke" }, () => {
  test("marketing home returns a non-5xx response", async ({ request }) => {
    const response = await request.get("/");
    expectNotServerError(response, "/");
    expect(response.ok() || (response.status() >= 300 && response.status() < 400)).toBeTruthy();
    const body = (await response.text()).trim();
    expect(body.length).toBeGreaterThan(0);
  });

  test("marketing home renders in the browser", async ({ page }) => {
    await expectHealthyDocument(page, "/");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
});
