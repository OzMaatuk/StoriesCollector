import { webcrypto } from 'crypto';

// Read at use-time to allow for environment changes (especially in tests)
const getSecret = () => process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret' : undefined);

// Use webcrypto directly to avoid global crypto issues in Node.js
const cryptoSubtle = webcrypto.subtle;

function base64UrlDecode(str: string): ArrayBuffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const buffer = Buffer.from(str, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array | Buffer): string {
  return Buffer.from(buffer as any)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function verifySignature(token: string, secret: string | undefined): Promise<boolean> {
  if (!secret) return false;
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) return false;

  const data = Buffer.from(`${headerB64}.${payloadB64}`, 'utf-8');
  const signature = base64UrlDecode(signatureB64);
  const secretBuffer = Buffer.from(secret, 'utf-8');

  const key = await cryptoSubtle.importKey(
    'raw',
    secretBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  return cryptoSubtle.verify('HMAC', key, signature, data);
}

export async function verifyToken(
  token: string
): Promise<{ recipient: string; channel: string } | null> {
  try {
    const secret = getSecret();
    if (process.env.NODE_ENV === 'production' && !secret) {
      // In production without a secret, treat as invalid token
      console.error('JWT verification attempted without JWT_SECRET set.');
      return null;
    }
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;

    const isValid = await verifySignature(token, secret);
    if (!isValid) return null;

    // Decode base64url properly
    const payloadStr = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = JSON.parse(Buffer.from(payloadStr, 'base64').toString());

    return {
      recipient: decodedPayload.recipient,
      channel: decodedPayload.channel,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function signToken(recipient: string, channel: string): Promise<string> {
  const secret = getSecret();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is not configured for production');
    }
  }

  // Use a fallback for tests or dev if secret is missing but not in production
  const finalSecret = secret || 'test-secret';

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    recipient,
    channel,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
  };

  const headerEncoded = base64UrlEncode(Buffer.from(JSON.stringify(header), 'utf-8'));
  const payloadEncoded = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf-8'));
  const data = `${headerEncoded}.${payloadEncoded}`;

  const key = await cryptoSubtle.importKey(
    'raw',
    Buffer.from(finalSecret, 'utf-8'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await cryptoSubtle.sign(
    'HMAC',
    key,
    Buffer.from(data, 'utf-8')
  );

  return `${data}.${base64UrlEncode(signature)}`;
}
