import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { OtpService } from '@/services/otp.service';

const sendOtpSchema = z.object({
  recipient: z.string().min(1, 'Recipient is required'),
  channel: z.enum(['email', 'sms'], {
    errorMap: () => ({ message: 'Channel must be either "email" or "sms"' }),
  }),
});

const otpService = new OtpService();

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = rateLimit(request);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { recipient, channel } = sendOtpSchema.parse(body);

    // Validate recipient format based on channel
    if (channel === 'email') {
      const emailSchema = z.string().email('Invalid email format');
      emailSchema.parse(recipient);
    } else if (channel === 'sms') {
      const phoneSchema = z.string().regex(
        /^\+[1-9]\d{1,14}$/,
        'Invalid phone number format. Use E.164 format (e.g., +1234567890)'
      );
      phoneSchema.parse(recipient);
    }

    const result = await otpService.sendOtp(recipient, channel);

    return NextResponse.json(
      {
        message: 'OTP sent successfully',
        recipient,
        channel,
        expiresIn: result.expiresIn,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '10',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        },
      }
    );
  } catch (error) {
    console.error('Error sending OTP:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}