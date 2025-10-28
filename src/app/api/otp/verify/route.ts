import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { OtpService } from '@/services/otp.service';

const verifyOtpSchema = z.object({
  recipient: z.string().min(1, 'Recipient is required'),
  code: z.string().length(6, 'OTP code must be 6 digits'),
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
    const { recipient, code } = verifyOtpSchema.parse(body);

    const result = await otpService.verifyOtp(recipient, code);

    if (!result.isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP code' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: 'OTP verified successfully',
        recipient,
        verified: true,
        token: result.token, // Short-lived verification token
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
    console.error('Error verifying OTP:', error);

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
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}