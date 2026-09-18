import { expect, test } from "@playwright/test";
import { expectNotServerError } from "./helpers";

/**
 * Protected portal paths and the login route come from proxy.ts:
 * unauthenticated /dashboard (and /portal, /owner, …) redirect to /login.
 * This suite is read-only: it never submits credentials or mutates data.
 */
test.describe("auth gates", { tag: "@smoke" }, () => {
  test("unauthenticated /dashboard redirects to sign-in", async ({ page }) => {
    const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    expectNotServerError(response, "/dashboard");

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/Authorized Safeway Couriers personnel only/i)).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
