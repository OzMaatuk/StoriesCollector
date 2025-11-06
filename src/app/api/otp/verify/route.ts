import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const verifyOtpSchema = z.object({
  recipient: z.string().min(1, 'Recipient is required'),
  code: z.string().length(6, 'OTP code must be 6 digits'),
});

const OTP_SERVICE_URL = process.env.OTP_SERVICE_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.OTP_SERVICE_URL) {
    return NextResponse.json(
      { error: 'OTP service is not configured' },
      { status: 500 }
    );
  }
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

    // Call external OTP service
    const response = await fetch(`${OTP_SERVICE_URL}/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient, code }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Invalid or expired OTP code' },
        { status: 400 }
      );
    }

    const result = await response.json();

    return NextResponse.json(
      {
        message: 'OTP verified successfully',
        recipient,
        verified: true,
        token: result.token, // Short-lived verification token from external service
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