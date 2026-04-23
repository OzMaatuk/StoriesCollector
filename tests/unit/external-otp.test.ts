import { webcrypto } from 'crypto';

// Set up global crypto BEFORE importing jwt module
global.crypto = webcrypto as Crypto;

// NOW import after setting up global crypto
import { verifyToken, signToken } from '../../src/lib/jwt';

interface JwtPayload {
  recipient: string;
  channel: string;
  [key: string]: unknown;
}

function tamperSignature(token: string): string {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return token;
  }

  const signature = parts[2];
  const firstChar = signature.charAt(0);
  const replacement = firstChar === 'A' ? 'B' : 'A';
  parts[2] = replacement + signature.slice(1);

  return parts.join('.');
}

describe('External OTP Service Integration', () => {
  beforeAll(() => {
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'your-secret-key';
    }
  });

  describe('JWT Token Verification', () => {
    it('should verify valid JWT tokens with environment secret', async () => {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const payload: JwtPayload = {
        recipient: 'test@example.com',
        channel: 'email',
      };

      const token = await signToken(payload.recipient, payload.channel);
      const result = await verifyToken(token);

      expect(result).toEqual({
        recipient: 'test@example.com',
        channel: 'email',
      });
    });

    it('should return null for invalid tokens', async () => {
      const result = await verifyToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for tokens with invalid signature', async () => {
      const payload: JwtPayload = {
        recipient: 'test@example.com',
        channel: 'email',
      };

      const token = await signToken(payload.recipient, payload.channel);
      const tamperedToken = tamperSignature(token);
      const result = await verifyToken(tamperedToken);

      expect(result).toBeNull();
    });

    it('should return null for malformed tokens', async () => {
      const result = await verifyToken('not.a.valid.jwt');
      expect(result).toBeNull();
    });
  });
});
