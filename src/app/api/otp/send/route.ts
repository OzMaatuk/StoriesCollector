import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const sendOtpSchema = z.object({
  recipient: z.string().min(1, 'Recipient is required'),
  channel: z.enum(['email']).refine((val) => val === 'email', {
    message: 'Channel must be "email"',
  }),
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
    return NextResponse.json({ error: 'OTP service is not configured' }, { status: 500 });
  }

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

    // Validate email format
    z.string().email('Invalid email format').parse(recipient);

    const url = `${OTP_SERVICE_URL}/otp/send`;
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
        body: JSON.stringify({ recipient, channel }),
        signal: AbortSignal.timeout(5 * 60 * 1000), // 5 minutes
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'External OTP service failed');
      }

      const result = await response.json();

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
    } finally {
      if (shouldBypassTls) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsSetting;
      }
    }
  } catch (error) {
    console.error('Error sending OTP:', error);

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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
