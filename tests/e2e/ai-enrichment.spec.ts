import { test, expect } from '@playwright/test';

test.describe('AI Enrichment Feature', () => {
  test('should display AI enriched content on story page', async ({ page }) => {
    const storyId = 'test-story-id';
    const mockedEnrichedText = 'This is a mocked enrichment from Rabbi Nachman.';

    // Mock the enrichment API response
    await page.route(`**/api/stories/${storyId}/enrichment`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'enrichment-id',
          storyId: storyId,
          providerName: 'Test Provider',
          modelName: 'Test Model',
          generatedText: mockedEnrichedText,
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      });
    });

    // Navigate to the story page
    await page.goto(`/en/stories/${storyId}`);

    // Verify the description box is visible
    const descriptionBox = page.locator('text=According to the writings of Rabbi Nachman of Breslov');
    await expect(descriptionBox).toBeVisible();

    // Verify the generated content is visible
    const generatedContent = page.locator(`text=${mockedEnrichedText}`);
    await expect(generatedContent).toBeVisible();

    // Verify the attribution
    const attribution = page.locator('text=Produced by Dicta AI');
    await expect(attribution).toBeVisible();
  });

  test('should show pending state', async ({ page }) => {
    const storyId = 'pending-story-id';

    await page.route(`**/api/stories/${storyId}/enrichment`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'pending',
        }),
      });
    });

    await page.goto(`/en/stories/${storyId}`);

    const pending = page.locator('text=Generating AI content...');
    await expect(pending).toBeVisible();
  });
});
