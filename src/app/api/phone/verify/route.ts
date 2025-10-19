import { NextRequest, NextResponse } from 'next/server';
import { verificationVerifySchema } from '@/lib/validation';
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
    const { phone, code } = verificationVerifySchema.parse(body);

    const provider = getVerificationProvider();
    const isValid = await provider.verifyCode(phone, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Phone verified successfully',
      phone,
      verified: true,
    });
  } catch (error) {
    console.error('Error verifying code:', error);

    if (error instanceof Error && error.message.includes('not implemented')) {
      return NextResponse.json(
        { error: 'Phone verification not implemented yet' },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}