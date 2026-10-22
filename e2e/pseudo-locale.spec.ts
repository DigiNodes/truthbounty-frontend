import { test, expect, stubClaimsApi } from './support/test';

/**
 * UI-FE-063 — Pseudo-locale screenshots and layout-expansion assertions.
 *
 * Loads representative shells through the pseudo-locales (`en-XA` accented /
 * expanded, `ar-XB` RTL bidi) and asserts that expanded copy never hides or
 * overlaps a primary action, then captures screenshots for visual review.
 *
 * Screenshots are produced per-platform by Playwright (`-<platform>.png`). The
 * Linux baselines are generated in CI with
 * `playwright test e2e/pseudo-locale.spec.ts --update-snapshots`.
 */

const PSEUDO_LOCALES = ['en-XA', 'ar-XB'] as const;

const SHELLS = [
  { name: 'home', path: '/' },
  { name: 'claims', path: '/claims' },
] as const;

for (const locale of PSEUDO_LOCALES) {
  for (const shell of SHELLS) {
    test.describe(`pseudo-locale ${locale} — ${shell.name}`, () => {
      test.use({ locale });

      test.beforeEach(async ({ page }) => {
        await stubClaimsApi(page);
        await page.addInitScript((value) => {
          window.localStorage.setItem('locale', value);
          document.documentElement.lang = value;
        }, locale);
      });

      test('renders without hidden or overlapping primary actions', async ({
        page,
      }) => {
        await page.goto(shell.path);
        await page.waitForLoadState('networkidle');

        // Every visible interactive control must be reachable: not clipped by
        // an ancestor with `overflow: hidden`, and not overlapped by a sibling.
        const controls = page.locator(
          'a[href], button:not([disabled]), [role="button"]',
        );
        const count = await controls.count();
        test.skip(count === 0, `no interactive controls on ${shell.path}`);

        for (let i = 0; i < count; i += 1) {
          const control = controls.nth(i);
          if (!(await control.isVisible())) continue;
          const box = await control.boundingBox();
          if (!box) continue;
          expect(box.width).toBeGreaterThan(0);
          expect(box.height).toBeGreaterThan(0);

          const center = await control.evaluate((node) => {
            const rect = node.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const top = document.elementFromPoint(x, y);
            return top ? top.closest('a, button, [role="button"]') === node : false;
          });
          expect(center, `control ${i} must be the top-most hit target`).toBe(
            true,
          );
        }
      });

      test('expanded copy does not create horizontal overflow', async ({
        page,
      }) => {
        await page.goto(shell.path);
        await page.waitForLoadState('networkidle');

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        // A small tolerance covers sub-pixel rounding; real expansion overflow
        // is far larger than a couple of pixels.
        expect(overflow).toBeLessThanOrEqual(2);
      });

      test('captures a pseudo-locale screenshot', async ({ page }) => {
        await page.goto(shell.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        await expect(page).toHaveScreenshot(
          `pseudo-${locale}-${shell.name}.png`,
          { maxDiffPixelRatio: 0.1, fullPage: false },
        );
      });
    });
  }
}
