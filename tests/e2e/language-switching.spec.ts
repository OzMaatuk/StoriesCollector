import { test, expect } from '@playwright/test';

test.describe('Language Switching', () => {
  test('should switch between languages', async ({ page }) => {
    await page.goto('/en');

    // Check English content
    await expect(page.locator('text=Welcome to Stories Collector')).toBeVisible();

    // Switch to Hebrew
    await page.selectOption('select', 'he');
    await page.waitForURL('**/he');

    // Check Hebrew content
    await expect(page.locator('text=ברוכים הבאים לאוסף הסיפורים')).toBeVisible();

    // Switch to French
    await page.selectOption('select', 'fr');
    await page.waitForURL('**/fr');

    // Check French content
    await expect(page.locator('text=Bienvenue sur Collecteur d\'Histoires')).toBeVisible();
  });

  test('should maintain RTL direction for Hebrew', async ({ page }) => {
    await page.goto('/he');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });
});