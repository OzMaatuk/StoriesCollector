import { jest } from '@jest/globals';

import { OtpService } from '@/services/otp.service';
import { ConsoleProvider } from '@/services/notifications/providers/console.provider';

// --- 2. Create mock send function FIRST ---
const mockSend = jest.fn().mockResolvedValue(undefined);

// --- 3. Mock the OTHER providers to be unconfigured ---
jest.mock('@/services/notifications/providers/smtp.provider', () => ({
  SmtpProvider: jest.fn().mockImplementation(() => ({
    type: 'email',
    isConfigured: jest.fn().mockReturnValue(false),
    send: jest.fn(),
  })),
}));

jest.mock('@/services/notifications/providers/textbee.provider', () => ({
  TextBeeProvider: jest.fn().mockImplementation(() => ({
    type: 'sms',
    isConfigured: jest.fn().mockReturnValue(false),
    send: jest.fn(),
  })),
}));

// --- 4. Spy on the REAL ConsoleProvider's prototype ---
const consoleSendSpy = jest
  .spyOn(ConsoleProvider.prototype, 'send')
  .mockImplementation(mockSend as any);

describe('OtpService', () => {
  let otpService: OtpService;
  const testConfig = {
    ttl: 300,
    maxAttempts: 5,
    jwtSecret: 'test-jwt-secret-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSendSpy.mockImplementation(mockSend as any);
    otpService = new OtpService(testConfig);
  });

  afterAll(() => {
    consoleSendSpy.mockRestore();
  });

  describe('sendOtp', () => {
    it('should generate and send an OTP code via email', async () => {
      const result = await otpService.sendOtp('test@example.com', 'email');
      expect(result.expiresIn).toBe(testConfig.ttl);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'test@example.com',
          subject: 'Your verification code',
          message: expect.stringMatching(/Your verification code is: \d{6}/),
        })
      );
    });

    it('should generate and send an OTP code via SMS', async () => {
      const result = await otpService.sendOtp('+1234567890', 'sms');
      expect(result.expiresIn).toBe(testConfig.ttl); // Verify our spy (which is mockSend) was called

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: '+1234567890',
          message: expect.stringMatching(/Your verification code is: \d{6}/),
        })
      );
    });
  });

  // --- The rest of your tests (no changes needed) ---
  describe('verifyOtp', () => {
    it('should verify a valid OTP code and return a JWT token', async () => {
      await otpService.sendOtp('+1234567890', 'sms');
      const otpRecord = (otpService as any).otpStore.get('+1234567890');
      expect(otpRecord).toBeDefined();

      const result = await otpService.verifyOtp('+1234567890', otpRecord.code);
      expect(result.isValid).toBe(true);
      expect(result.token).toBeDefined();

      const decoded = otpService.verifyToken(result.token!);
      expect(decoded).toBeDefined();
      expect(decoded?.recipient).toBe('+1234567890');
      expect(decoded?.channel).toBe('sms');
    });

    it('should reject an invalid OTP code', async () => {
      await otpService.sendOtp('+1234567890', 'sms');
      const result = await otpService.verifyOtp('+1234567890', '000000');
      expect(result.isValid).toBe(false);
      expect(result.token).toBeUndefined();
    });

    it('should reject after max attempts', async () => {
      await otpService.sendOtp('+1S234567890', 'sms'); // Using a different key to avoid test conflicts
      for (let i = 0; i < 5; i++) {
        const result = await otpService.verifyOtp('+1S234567890', '000000');
        expect(result.isValid).toBe(false);
      }

      const otpRecord = (otpService as any).otpStore.get('+1S234567890');
      expect(otpRecord).toBeDefined();

      const result = await otpService.verifyOtp('+1S234567890', otpRecord.code);
      expect(result.isValid).toBe(false);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid JWT token', async () => {
      await otpService.sendOtp('+1T234567890', 'sms'); // Using a different key
      const otpRecord = (otpService as any).otpStore.get('+1T234567890');
      const verifyResult = await otpService.verifyOtp('+1T234567890', otpRecord.code);

      const decoded = otpService.verifyToken(verifyResult.token!);
      expect(decoded).toBeDefined();
      expect(decoded?.recipient).toBe('+1T234567890');
      expect(decoded?.channel).toBe('sms');
    });

    it('should reject an invalid JWT token', () => {
      const result = otpService.verifyToken('invalid-token');
      expect(result).toBeNull();
    });
  });
});
