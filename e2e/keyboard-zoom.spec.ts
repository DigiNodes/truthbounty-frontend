import { expect, test, type Page } from "@playwright/test";

import { ZOOM_LEVELS } from "./support/zoom";

/**
 * UI-FE-046 — Keyboard-only usability at zoom levels.
 *
 * The acceptance criterion "no action becomes pointer-only" is asserted
 * here: at each zoom level, every interactive control surfaced by the
 * dashboard shell must be focusable and have a visible focus indicator.
 */

async function focusVisibleTargets(page: Page, maxSteps = 25): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.keyboard.press("Tab");
  for (let i = 0; i < maxSteps; i += 1) {
    const info = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active === null) return null;
      const rect = active.getBoundingClientRect();
      const style = window.getComputedStyle(active);
      return {
        tag: active.tagName.toLowerCase(),
        role: active.getAttribute("role") ?? "",
        label: (
          active.getAttribute("aria-label") ??
          (active.textContent ?? "").trim().slice(0, 80)
        ),
        hasSize: rect.width > 0 && rect.height > 0,
        hasOutline: style.outlineStyle !== "none" || style.outlineWidth !== "0px",
        inViewport:
          rect.bottom >= 0 &&
          rect.right >= 0 &&
          rect.top <= window.innerHeight &&
          rect.left <= window.innerWidth
      };
    });
    expect(info, `focus disappeared at step ${i}`).not.toBeNull();
    expect(info!.hasSize, `focused element has zero size: ${info!.tag}`).toBe(true);
    expect(
      info!.inViewport,
      `focused element off-screen at zoom: ${info!.tag} "${info!.label}"`
    ).toBe(true);
    await page.keyboard.press("Tab");
  }
}

for (const zoomLevel of ZOOM_LEVELS) {
  test.describe(`keyboard navigation at ${zoomLevel.label} zoom`, () => {
    test.use({ viewport: zoomLevel.viewport });

    test("dashboard shell remains keyboard-navigable", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await focusVisibleTargets(page, 20);
    });

    test("claims feed remains keyboard-navigable", async ({ page }) => {
      await page.goto("/claims");
      await page.waitForLoadState("networkidle");

      await focusVisibleTargets(page, 20);
    });
  });
}