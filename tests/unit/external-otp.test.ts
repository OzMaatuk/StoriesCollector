import { webcrypto } from 'crypto';

// Set up global crypto BEFORE any jwt code loads
global.crypto = webcrypto as Crypto;

// Do NOT import jwt at the top level — we require it fresh per test
// to guarantee signToken and verifyToken share the same module instance.

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
  describe('JWT Token Verification', () => {
    // Re-require jwt.ts fresh for every test so each test gets its own
    // module evaluation with a pinned secret. This eliminates races with
    // other test files that mutate process.env.JWT_SECRET.
    let signToken: (recipient: string, channel: string) => Promise<string>;
    let verifyToken: (token: string) => Promise<{ recipient: string; channel: string } | null>;

    beforeEach(() => {
      jest.resetModules();
      process.env.JWT_SECRET = 'consistent-test-secret-for-external-otp';
      const jwt = require('../../src/lib/jwt');
      signToken = jwt.signToken;
      verifyToken = jwt.verifyToken;
    });

    it('should verify valid JWT tokens with environment secret', async () => {
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