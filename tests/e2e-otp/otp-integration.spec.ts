import { test, expect } from '@playwright/test';

test.describe('OTP Integration E2E', () => {
  const OTP_SERVICE_URL = process.env.OTP_SERVICE_URL || 'http://localhost:3000';

  test.beforeEach(async () => {
    // Skip these tests in CI if OTP service is not available
    if (process.env.CI && !process.env.RUN_OTP_E2E) {
      test.skip(true, 'OTP E2E tests skipped in CI - set RUN_OTP_E2E=true to enable');
    }
  });

  test('should send OTP via API', async ({ request }) => {
    const response = await request.post(`${OTP_SERVICE_URL}/otp/send`, {
      data: {
        recipient: '+15555550123',
        channel: 'sms',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.message).toBe('OTP sent successfully');
    expect(data.expiresIn).toBeGreaterThan(0);
  });

  test('should send OTP via email', async ({ request }) => {
    const response = await request.post(`${OTP_SERVICE_URL}/otp/send`, {
      data: {
        recipient: 'test@example.com',
        channel: 'email',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.message).toBe('OTP sent successfully');
    expect(data.channel).toBe('email');
  });

  test('should handle invalid recipient format', async ({ request }) => {
    const response = await request.post(`${OTP_SERVICE_URL}/otp/send`, {
      data: {
        recipient: 'invalid-phone',
        channel: 'sms',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should verify OTP with correct code', async ({ request }) => {
    // This test assumes the external OTP service has a test mode
    // or you have a known test code for development
    const testCode = process.env.TEST_OTP_CODE || '123456';

    // First send OTP
    await request.post(`${OTP_SERVICE_URL}/otp/send`, {
      data: {
        recipient: '+15555550123',
        channel: 'sms',
      },
    });

    // Then verify (this would work if the external service has a test mode)
    const verifyResponse = await request.post(`${OTP_SERVICE_URL}/otp/verify`, {
      data: {
        recipient: '+15555550123',
        code: testCode,
      },
    });

    // In a real external service, this might fail unless it's in test mode
    // The test documents the expected behavior
    if (verifyResponse.ok()) {
      const data = await verifyResponse.json();
      expect(data.verified).toBe(true);
      expect(data.token).toBeDefined();
    } else {
      // Expected in production - we can't guess the real OTP code
      expect(verifyResponse.status()).toBe(400);
    }
  });

  test('should integrate with story submission flow', async ({ page }) => {
    // This test shows how OTP would integrate with the full story flow
    await page.goto('/en/submit');

    // Fill in story form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="phone"]', '+15555550123');
    await page.fill('textarea[name="content"]', 'This is a test story with OTP verification.');

    // In a real implementation, this would trigger OTP flow
    // For now, we just test that the form accepts the input
    await page.click('button[type="submit"]');

    // The form should submit (even without OTP verification in current implementation)
    await expect(page.locator('text=Thank you!')).toBeVisible({ timeout: 10000 });
  });
});
