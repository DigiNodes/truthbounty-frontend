import { expect, test } from "@playwright/test";

import { TEXT_SPACING_CSS, clippedElements, horizontalOverflow } from "./support/zoom";

/**
 * UI-FE-046 — WCAG 1.4.12 Text Spacing.
 *
 * Applies the standard WCAG overrides:
 *   line-height: 1.5
 *   letter-spacing: 0.12em
 *   word-spacing: 0.16em
 *   paragraph spacing: 2em
 *
 * Then asserts that no content is clipped, overlapped, or pushed out of
 * view. The overrides must not force horizontal scrolling either.
 */

const CORE_ROUTES = [
  { path: "/", name: "dashboard" },
  { path: "/claims", name: "claims" },
  { path: "/rewards", name: "rewards" },
  { path: "/how-it-works", name: "how-it-works" }
] as const;

for (const route of CORE_ROUTES) {
  test.describe(`${route.name} with WCAG 1.4.12 text spacing`, () => {
    test("does not clip or hide content", async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");

      await page.addStyleTag({ content: TEXT_SPACING_CSS });
      // Let layout settle after the injected overrides.
      await page.waitForTimeout(100);

      const clipped = await clippedElements(page);
      expect(
        clipped,
        `${route.path} clips content after text-spacing overrides: ${clipped.join(", ")}`
      ).toEqual([]);
    });

    test("does not introduce horizontal scrolling", async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");

      await page.addStyleTag({ content: TEXT_SPACING_CSS });
      await page.waitForTimeout(100);

      const overflow = await horizontalOverflow(page);
      expect(
        overflow,
        `${route.path} overflows horizontally by ${overflow}px after text-spacing overrides`
      ).toBeLessThanOrEqual(0);
    });
  });
}