import crypto from 'crypto';
import jwt from 'jsonwebtoken';

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

export class OtpService {
  private otpStore: Map<string, OtpRecord> = new Map();
  private readonly OTP_TTL = parseInt(process.env.OTP_CODE_TTL_SECONDS || '300'); // 5 minutes
  private readonly MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5');
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  constructor() {
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

    // Send OTP based on channel
    if (channel === 'email') {
      await this.sendEmailOtp(recipient, code);
    } else {
      await this.sendSmsOtp(recipient, code);
    }

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
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
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
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
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

  private async sendEmailOtp(email: string, code: string): Promise<void> {
    // TODO: Implement email sending logic
    // For now, just log to console for development
    console.log(`[EMAIL OTP] Sending OTP ${code} to ${email}`);
    
    // In production, integrate with email service like:
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    
    // Example implementation:
    // await emailService.send({
    //   to: email,
    //   subject: 'Your verification code',
    //   text: `Your verification code is: ${code}. This code will expire in ${this.OTP_TTL / 60} minutes.`,
    // });
  }

  private async sendSmsOtp(phone: string, code: string): Promise<void> {
    // TODO: Implement SMS sending logic with TextBee or other provider
    // For now, just log to console for development
    console.log(`[SMS OTP] Sending OTP ${code} to ${phone}`);
    
    // In production, integrate with SMS service like:
    // - TextBee (as mentioned in plan.md)
    // - Twilio
    // - AWS SNS
    
    // Example TextBee implementation:
    // const response = await axios.post(
    //   `${process.env.TEXTBEE_BASE_URL}/gateway/devices/${process.env.TEXTBEE_DEVICE_ID}/send-sms`,
    //   {
    //     recipients: [phone],
    //     message: `Your verification code is: ${code}. This code will expire in ${this.OTP_TTL / 60} minutes.`
    //   },
    //   {
    //     headers: {
    //       'x-api-key': process.env.TEXTBEE_API_KEY
    //     }
    //   }
    // );
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