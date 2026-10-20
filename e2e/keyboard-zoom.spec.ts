import { expect, test, type Page } from "@playwright/test";

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
      `focused element off-screen: ${info!.tag} "${info!.label}"`
    ).toBe(true);
    await page.keyboard.press("Tab");
  }
}

test.describe("keyboard navigation at 200% zoom", () => {
  test.use({ viewport: { width: 640, height: 720 } });

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

test.describe("keyboard navigation at 400% zoom", () => {
  test.use({ viewport: { width: 320, height: 360 } });

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