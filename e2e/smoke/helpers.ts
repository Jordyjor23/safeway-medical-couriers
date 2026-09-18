import { expect, type Page } from "@playwright/test";

type StatusResponse = { status(): number } | null;

export function expectNotServerError(response: StatusResponse, path: string) {
  expect(response, `expected a response for ${path}`).toBeTruthy();
  const status = response!.status();
  expect(status, `${path} returned HTTP ${status}`).toBeGreaterThanOrEqual(200);
  expect(status, `${path} returned HTTP ${status}`).toBeLessThan(500);
}

export async function expectHealthyDocument(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expectNotServerError(response, path);

  const body = (await page.locator("body").innerText()).trim();
  expect(body.length, `${path} body was empty`).toBeGreaterThan(0);
  await expect(page.locator("h1").first()).toBeVisible();
  const title = await page.title();
  expect(title.trim().length, `${path} had an empty title`).toBeGreaterThan(0);
}

export async function expectHeading(page: Page, heading: string | RegExp) {
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(heading);
}
