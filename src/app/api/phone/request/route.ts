import { NextRequest, NextResponse } from 'next/server';
import { verificationRequestSchema } from '@/lib/validation';
import { getVerificationProvider } from '@/services/verification';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = rateLimit(request);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { phone } = verificationRequestSchema.parse(body);

    const provider = getVerificationProvider();
    await provider.requestCode(phone);

    return NextResponse.json({
      message: 'Verification code sent successfully',
      phone,
    });
  } catch (error) {
    console.error('Error requesting verification code:', error);

    if (error instanceof Error && error.message.includes('not implemented')) {
      return NextResponse.json(
        { error: 'Phone verification not implemented yet' },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to request verification code' },
      { status: 500 }
    );
  }
}