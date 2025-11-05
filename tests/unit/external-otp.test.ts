// tests/unit/external-otp.test.ts

import { webcrypto } from 'crypto';

// Set up global crypto BEFORE importing jwt module
global.crypto = webcrypto as Crypto;

// NOW import after setting up global crypto
import { verifyToken } from '../../src/lib/jwt';

// Helper function to create a test JWT token
function base64UrlEncode(input: string | ArrayBuffer): string {
  let buffer: Buffer;

  if (typeof input === 'string') {
    buffer = Buffer.from(input);
  } else {
    buffer = Buffer.from(input);
  }

  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createTestToken(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));

  const data = `${headerB64}.${payloadB64}`;
  const dataBuffer = Buffer.from(data, 'utf-8');
  const secretBuffer = Buffer.from(secret, 'utf-8');

  const key = await webcrypto.subtle.importKey(
    'raw',
    secretBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await webcrypto.subtle.sign('HMAC', key, dataBuffer);

  const signatureB64 = base64UrlEncode(signature);

  return `${data}.${signatureB64}`;
}

describe('External OTP Service Integration', () => {
  describe('JWT Token Verification', () => {
    it('should verify valid JWT tokens with environment secret', async () => {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const payload = {
        recipient: '+1234567890',
        channel: 'sms',
      };

      const token = await createTestToken(payload, secret);
      const result = await verifyToken(token);

      expect(result).toEqual({
        recipient: '+1234567890',
        channel: 'sms',
      });
    });

    it('should return null for invalid tokens', async () => {
      const result = await verifyToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for tokens with invalid signature', async () => {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const payload = {
        recipient: '+1234567890',
        channel: 'sms',
      };

      const token = await createTestToken(payload, secret);
      // Tamper with the token
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      const result = await verifyToken(tamperedToken);

      expect(result).toBeNull();
    });

    it('should return null for malformed tokens', async () => {
      const result = await verifyToken('not.a.valid.jwt');
      expect(result).toBeNull();
    });
  });
});
