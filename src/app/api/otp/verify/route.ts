import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { signToken } from '@/lib/jwt';

const verifyOtpSchema = z.object({
  recipient: z.string().min(1, 'Recipient is required'),
  code: z.string().length(6, 'OTP code must be 6 digits'),
});

const OTP_SERVICE_URL = process.env.OTP_SERVICE_URL || 'http://localhost:8080';

function shouldBypassTlsForLocalDev(url: string) {
  // Some local OTP backends run HTTPS with self-signed certs.
  // In dev only, allow bypassing TLS validation for localhost/127.0.0.1.
  if (process.env.NODE_ENV === 'production') return false;
  if (!url.startsWith('https://')) return false;
  return /https:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

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
    const url = `${OTP_SERVICE_URL}/otp/verify`;
    const shouldBypassTls = shouldBypassTlsForLocalDev(OTP_SERVICE_URL);
    const previousTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

    if (shouldBypassTls) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.OTP_SERVICE_API_KEY || '',
        },
        body: JSON.stringify({ recipient, code }),
        signal: AbortSignal.timeout(5 * 60 * 1000), // 5 minutes
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.error || 'Invalid or expired OTP code' },
          { status: 400 }
        );
      }

      await response.json();
    } finally {
      if (shouldBypassTls) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsSetting;
      }
    }

    // Sign a verification token locally for the app to use.
    // This removes dependency on the external service's token format/secret.
    const localToken = await signToken(recipient, 'email');

    return NextResponse.json(
      {
        message: 'OTP verified successfully',
        recipient,
        verified: true,
        token: localToken,
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

    // Network / connectivity / TLS errors talking to the OTP backend
    if (error instanceof TypeError) {
      return NextResponse.json(
        {
          error: 'Failed to reach OTP service',
          details: OTP_SERVICE_URL,
        },
        { status: 502 }
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