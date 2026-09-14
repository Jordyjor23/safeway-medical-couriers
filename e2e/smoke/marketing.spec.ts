import { expect, test } from "@playwright/test";
import { expectHeading, expectHealthyDocument } from "./helpers";

const marketingPages: { path: string; heading: string | RegExp; extra?: string | RegExp }[] = [
  {
    path: "/",
    heading: /Medical Deliveries That Can't Afford to Be Late/i,
  },
  {
    path: "/services",
    heading: /Medical Courier Services Built Around Healthcare/i,
  },
  {
    path: "/quote",
    heading: /Request medical courier service or a compliance packet/i,
  },
  {
    path: "/careers",
    heading: /.+/,
    extra: /Why work with Safeway Couriers/i,
  },
  {
    path: "/about",
    heading: /A Courier Partner Healthcare Organizations Can Depend On/i,
  },
  {
    path: "/contact",
    heading: /Contact Safeway Couriers/i,
  },
];

test.describe("marketing smoke", { tag: "@smoke" }, () => {
  for (const pageSpec of marketingPages) {
    test(`${pageSpec.path} is reachable and has key copy`, async ({ page }) => {
      await expectHealthyDocument(page, pageSpec.path);
      await expectHeading(page, pageSpec.heading);
      if (pageSpec.extra) {
        await expect(page.getByText(pageSpec.extra).first()).toBeVisible();
      }
    });
  }
});
