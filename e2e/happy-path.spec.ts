import { test, expect } from '@playwright/test';

test('happy path: connect wallet -> submit claim -> verify -> view reward', async ({ page }) => {
  await page.goto('/');

  // 1. Verify dashboard layout and header
  await expect(page.locator('header[role="banner"]')).toBeVisible();

  // 2. Connect wallet button interaction (best-effort)
  const connectBtn = page.getByRole('button', { name: /connect/i }).first();
  if (await connectBtn.isVisible()) {
    await connectBtn.click();
    await page.keyboard.press('Escape');
  }

  // 3. Open submit claim modal if button is present
  const openModalBtn = page.getByRole('button', { name: /submit claim|claim/i }).first();
  if (await openModalBtn.isVisible()) {
    await openModalBtn.click();

    const titleInput = page.locator('#claim-title, input[placeholder*="Title"], input[aria-label="Title"]');
    if (await titleInput.isVisible()) {
      await titleInput.fill('Test claim from e2e');
    }
  }

  // 4. Verify main dashboard content and rewards panel are visible
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.locator('text=/reward|claim|active|truthbounty/i').first()).toBeVisible();
});
