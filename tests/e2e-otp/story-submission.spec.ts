import { test, expect } from '@playwright/test';

test.describe('Story Submission Flow', () => {
  test('should submit a story successfully', async ({ page }) => {
    await page.goto('/en/submit');

    // Fill in required fields
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.fill('textarea[name="content"]', 'This is a test story with enough content to pass validation.');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('text=Thank you!')).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto('/en/submit');

    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // Check for browser validation or custom error messages
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveAttribute('required');
  });

  test('should validate phone number format', async ({ page }) => {
    await page.goto('/en/submit');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="phone"]', '123'); // Invalid phone
    await page.fill('textarea[name="content"]', 'This is a test story.');

    await page.click('button[type="submit"]');

    // Check for phone validation error
    await expect(page.locator('text=/Invalid phone/')).toBeVisible({ timeout: 5000 });
  });
});