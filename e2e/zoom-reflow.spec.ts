import { expect, test } from "@playwright/test";

import {
  horizontalOverflow,
  clippedElements,
  unreachableInteractiveElements,
  ZOOM_LEVELS
} from "./support/zoom";

/**
 * UI-FE-046 — Prove 200–400% zoom, reflow, and text-spacing support.
 *
 * Each core journey is loaded at 200% and 400% zoom (as a 640 px and 320 px
 * viewport, matching WCAG 1.4.10's "320 CSS px equivalent"), and asserted:
 *  - no document-level horizontal scrolling
 *  - no element clipped by its own box
 *  - every interactive element is visible and labelled
 */

const CORE_ROUTES = [
  { path: "/", name: "dashboard" },
  { path: "/claims", name: "claims" },
  { path: "/claim-detail", name: "claim-detail" },
  { path: "/rewards", name: "rewards" },
  { path: "/how-it-works", name: "how-it-works" }
] as const;

for (const zoomLevel of ZOOM_LEVELS) {
  for (const route of CORE_ROUTES) {
    test.describe(`${route.name} at ${zoomLevel.label} zoom`, () => {
      test.use({ viewport: zoomLevel.viewport });

      test("no horizontal page overflow", async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");

        const overflow = await horizontalOverflow(page);
        expect(
          overflow,
          `${route.path} overflows horizontally by ${overflow}px at ${zoomLevel.label}`
        ).toBeLessThanOrEqual(0);
      });

      test("no element clipped by its own box", async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");

        const clipped = await clippedElements(page);
        expect(
          clipped,
          `${route.path} has clipped elements at ${zoomLevel.label}: ${clipped.join(", ")}`
        ).toEqual([]);
      });

      test("every interactive element is reachable and labelled", async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");

        const unreachable = await unreachableInteractiveElements(page);
        expect(
          unreachable,
          `${route.path} has unreachable interactive elements at ${zoomLevel.label}: ${unreachable.join(", ")}`
        ).toEqual([]);
      });
    });
  }
}