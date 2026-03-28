import { test, expect } from '@playwright/test';

test('happy path: connect wallet -> submit claim -> verify -> view reward', async ({ page }) => {
  await page.goto('/');

  // 1. Connect wallet (best-effort, UI-dependent)
  const connectBtn = page.getByRole('button', { name: /connect/i });
  if (await connectBtn.isVisible()) {
    await connectBtn.click();
  }

  // 2. Submit claim
  const claimInput = page.locator('textarea, input[type="text"]').first();
  await claimInput.fill('Test claim from e2e');

  const submitBtn = page.getByRole('button', { name: /submit/i });
  await submitBtn.click();

  // 3. Verify claim appears
  await expect(page.locator('text=Test claim from e2e')).toBeVisible();

  // 4. View reward
  const rewardText = page.locator('text=/reward/i');
  await expect(rewardText).toBeVisible();
});
