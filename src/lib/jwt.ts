import { createHmac, timingSafeEqual } from 'crypto';

const getSecret = () =>
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'test' ? 'test-secret' : undefined);

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): Buffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

function hmacSign(data: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(data).digest();
  return base64UrlEncode(sig);
}

function hmacVerify(data: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(hmacSign(data, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function verifyToken(
  token: string
): Promise<{ recipient: string; channel: string } | null> {
  try {
    const secret = getSecret();
    if (!secret) {
      console.error('JWT verification attempted without JWT_SECRET set.');
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const isValid = hmacVerify(`${headerB64}.${payloadB64}`, signatureB64, secret);
    if (!isValid) return null;

    const decodedPayload = JSON.parse(
      base64UrlDecode(payloadB64).toString('utf-8')
    );

    return {
      recipient: decodedPayload.recipient,
      channel: decodedPayload.channel,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function signToken(
  recipient: string,
  channel: string
): Promise<string> {
  const secret = getSecret();
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    recipient,
    channel,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };

  const headerEncoded = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const payloadEncoded = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const data = `${headerEncoded}.${payloadEncoded}`;
  const signature = hmacSign(data, secret);

  return `${data}.${signature}`;
}