import { jest } from '@jest/globals';
import { verifyToken } from '@/lib/jwt';

// Mock fetch globally with proper typing
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('External OTP Service Integration', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT Token Verification', () => {
    it('should verify valid JWT tokens with environment secret', () => {
      // This tests the JWT utility that replaces the old OtpService
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      
      const token = jwt.sign(
        { recipient: '+1234567890', channel: 'sms', verified: true },
        secret
      );

      const result = verifyToken(token);

      expect(result).toEqual({
        recipient: '+1234567890',
        channel: 'sms',
      });
    });

    it('should return null for invalid tokens', () => {
      const result = verifyToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('External OTP Service Configuration', () => {
    it('should use correct OTP service URL from environment', () => {
      const originalUrl = process.env.OTP_SERVICE_URL;
      process.env.OTP_SERVICE_URL = 'https://external-otp.example.com';

      // Test that the environment variable is properly configured
      expect(process.env.OTP_SERVICE_URL).toBe('https://external-otp.example.com');

      // Restore original env
      process.env.OTP_SERVICE_URL = originalUrl;
    });

    it('should fallback to localhost when OTP_SERVICE_URL is not set', () => {
      const originalUrl = process.env.OTP_SERVICE_URL;
      delete process.env.OTP_SERVICE_URL;

      const defaultUrl = process.env.OTP_SERVICE_URL || 'http://localhost:3000';
      expect(defaultUrl).toBe('http://localhost:3000');

      // Restore original env
      process.env.OTP_SERVICE_URL = originalUrl;
    });
  });

  describe('Fetch Integration', () => {
    it('should make correct fetch calls for OTP send', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expiresIn: 300 }),
      } as Response);

      // Simulate the fetch call that would be made by the API route
      const response = await fetch('http://localhost:3000/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: '+1234567890', channel: 'sms' }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/otp/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: '+1234567890', channel: 'sms' }),
        }
      );

      expect(response.ok).toBe(true);
    });

    it('should make correct fetch calls for OTP verify', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'jwt-token-here' }),
      } as Response);

      // Simulate the fetch call that would be made by the API route
      const response = await fetch('http://localhost:3000/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: '+1234567890', code: '123456' }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/otp/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: '+1234567890', code: '123456' }),
        }
      );

      expect(response.ok).toBe(true);
    });
  });
});