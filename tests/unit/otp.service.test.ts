import { OtpService } from '@/services/otp.service';

describe('OtpService', () => {
  let otpService: OtpService;

  beforeEach(() => {
    otpService = new OtpService();
  });

  describe('sendOtp', () => {
    it('should generate and send an OTP code', async () => {
      const result = await otpService.sendOtp('+1234567890', 'sms');
      expect(result.expiresIn).toBe(300); // 5 minutes in seconds
    });
  });

  describe('verifyOtp', () => {
    it('should verify a valid OTP code and return a JWT token', async () => {
      // First send an OTP
      await otpService.sendOtp('+1234567890', 'sms');

      // Get the OTP code from the private store (for testing only)
      const otpRecord = (otpService as any).otpStore.get('+1234567890');
      expect(otpRecord).toBeDefined();

      // Verify the OTP
      const result = await otpService.verifyOtp('+1234567890', otpRecord.code);
      expect(result.isValid).toBe(true);
      expect(result.token).toBeDefined();

      // Verify the JWT token
      const decoded = otpService.verifyToken(result.token!);
      expect(decoded).toBeDefined();
      expect(decoded?.recipient).toBe('+1234567890');
      expect(decoded?.channel).toBe('sms');
    });

    it('should reject an invalid OTP code', async () => {
      // First send an OTP
      await otpService.sendOtp('+1234567890', 'sms');

      // Try to verify with wrong code
      const result = await otpService.verifyOtp('+1234567890', '000000');
      expect(result.isValid).toBe(false);
      expect(result.token).toBeUndefined();
    });

    it('should reject after max attempts', async () => {
      // First send an OTP
      await otpService.sendOtp('+1234567890', 'sms');

      // Try to verify multiple times with wrong code
      for (let i = 0; i < 5; i++) {
        const result = await otpService.verifyOtp('+1234567890', '000000');
        expect(result.isValid).toBe(false);
      }

      // Get the OTP code from the private store (for testing only)
      const otpRecord = (otpService as any).otpStore.get('+1234567890');
      expect(otpRecord).toBeDefined();

      // Try one more time with correct code - should still fail
      const result = await otpService.verifyOtp('+1234567890', otpRecord.code);
      expect(result.isValid).toBe(false);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid JWT token', async () => {
      // First send and verify an OTP to get a token
      await otpService.sendOtp('+1234567890', 'sms');
      const otpRecord = (otpService as any).otpStore.get('+1234567890');
      const verifyResult = await otpService.verifyOtp('+1234567890', otpRecord.code);

      // Verify the token
      const decoded = otpService.verifyToken(verifyResult.token!);
      expect(decoded).toBeDefined();
      expect(decoded?.recipient).toBe('+1234567890');
      expect(decoded?.channel).toBe('sms');
    });

    it('should reject an invalid JWT token', () => {
      const result = otpService.verifyToken('invalid-token');
      expect(result).toBeNull();
    });
  });
});
