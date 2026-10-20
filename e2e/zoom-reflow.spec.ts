import { expect, test } from "@playwright/test";

import {
  horizontalOverflow,
  clippedElements,
  unreachableInteractiveElements
} from "./support/zoom";

const CORE_ROUTES = [
  { path: "/", name: "dashboard" },
  { path: "/claims", name: "claims" },
  { path: "/claim-detail", name: "claim-detail" },
  { path: "/rewards", name: "rewards" },
  { path: "/how-it-works", name: "how-it-works" }
] as const;

const ZOOM_200 = { width: 640, height: 720 };
const ZOOM_400 = { width: 320, height: 360 };

test.describe("200% zoom", () => {
  test.use({ viewport: ZOOM_200 });

  for (const route of CORE_ROUTES) {
    test(`${route.name} — no horizontal page overflow`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      const overflow = await horizontalOverflow(page);
      expect(
        overflow,
        `${route.path} overflows horizontally by ${overflow}px at 200%`
      ).toBeLessThanOrEqual(0);
    });

    test(`${route.name} — no element clipped by its own box`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      const clipped = await clippedElements(page);
      expect(
        clipped,
        `${route.path} has clipped elements at 200%: ${clipped.join(", ")}`
      ).toEqual([]);
    });

    test(`${route.name} — every interactive element is reachable and labelled`, async ({
      page
    }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      const unreachable = await unreachableInteractiveElements(page);
      expect(
        unreachable,
        `${route.path} has unreachable interactive elements at 200%: ${unreachable.join(", ")}`
      ).toEqual([]);
    });
  }
});

test.describe("400% zoom", () => {
  test.use({ viewport: ZOOM_400 });

  for (const route of CORE_ROUTES) {
    test(`${route.name} — no horizontal page overflow`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      const overflow = await horizontalOverflow(page);
      expect(
        overflow,
        `${route.path} overflows horizontally by ${overflow}px at 400%`
      ).toBeLessThanOrEqual(0);
    });

    test(`${route.name} — no element clipped by its own box`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      const clipped = await clippedElements(page);
      expect(
        clipped,
        `${route.path} has clipped elements at 400%: ${clipped.join(", ")}`
      ).toEqual([]);
    });

    test(`${route.name} — every interactive element is reachable and labelled`, async ({
      page
    }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      const unreachable = await unreachableInteractiveElements(page);
      expect(
        unreachable,
        `${route.path} has unreachable interactive elements at 400%: ${unreachable.join(", ")}`
      ).toEqual([]);
    });
  }
});