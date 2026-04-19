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
