import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NotificationService } from './notifications/providers';
import type { NotificationConfig } from './notifications/providers/types';

interface OtpRecord {
  code: string;
  recipient: string;
  channel: 'email' | 'sms';
  expiresAt: Date;
  attempts: number;
}

interface SendOtpResult {
  expiresIn: number; // seconds
}

interface VerifyOtpResult {
  isValid: boolean;
  token?: string; // JWT token for verified recipient
}

interface OtpServiceConfig extends NotificationConfig {
  ttl?: number; // seconds
  maxAttempts?: number;
  jwtSecret?: string;
}

export class OtpService {
  private otpStore: Map<string, OtpRecord> = new Map();
  private readonly OTP_TTL: number;
  private readonly MAX_ATTEMPTS: number;
  private readonly JWT_SECRET: string;
  private readonly notificationService: NotificationService;

  constructor(config: OtpServiceConfig = {}) {
    this.OTP_TTL = config.ttl ?? parseInt(process.env.OTP_CODE_TTL_SECONDS || '300', 10);
    this.MAX_ATTEMPTS = config.maxAttempts ?? parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
    this.JWT_SECRET = config.jwtSecret ?? process.env.JWT_SECRET ?? 'your-secret-key';
    this.notificationService = new NotificationService(config);

    // Clean up expired OTPs every minute
    setInterval(() => this.cleanupExpiredOtps(), 60000);
  }

  async sendOtp(recipient: string, channel: 'email' | 'sms'): Promise<SendOtpResult> {
    // Generate 6-digit OTP
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + this.OTP_TTL * 1000);

    // Store OTP
    const otpRecord: OtpRecord = {
      code,
      recipient,
      channel,
      expiresAt,
      attempts: 0,
    };

    this.otpStore.set(recipient, otpRecord);

    // Send OTP via notification provider
    const provider = this.notificationService.getProvider(channel);
    const message = `Your verification code is: ${code}. This code will expire in ${Math.floor(
      this.OTP_TTL / 60
    )} minutes.`;

    await provider.send({
      recipient,
      subject: 'Your verification code',
      message,
    });

    return {
      expiresIn: this.OTP_TTL,
    };
  }

  async verifyOtp(recipient: string, code: string): Promise<VerifyOtpResult> {
    const otpRecord = this.otpStore.get(recipient);

    if (!otpRecord) {
      return { isValid: false };
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      this.otpStore.delete(recipient);
      return { isValid: false };
    }

    // Check attempts
    if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(recipient);
      return { isValid: false };
    }

    // Increment attempts
    otpRecord.attempts++;

    // Verify code
    if (otpRecord.code !== code) {
      return { isValid: false };
    }

    // Valid OTP - remove from store and generate token
    this.otpStore.delete(recipient);

    const token = jwt.sign(
      {
        recipient,
        channel: otpRecord.channel,
        verified: true,
        exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
      },
      this.JWT_SECRET
    );

    return {
      isValid: true,
      token,
    };
  }

  verifyToken(token: string): { recipient: string; channel: string } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as unknown & {
        recipient: string;
        channel: string;
        verified: boolean;
      };
      return {
        recipient: decoded.recipient,
        channel: decoded.channel,
      };
    } catch {
      return null;
    }
  }

  private generateOtpCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private cleanupExpiredOtps(): void {
    const now = new Date();
    for (const [recipient, record] of this.otpStore.entries()) {
      if (now > record.expiresAt) {
        this.otpStore.delete(recipient);
      }
    }
  }
}
