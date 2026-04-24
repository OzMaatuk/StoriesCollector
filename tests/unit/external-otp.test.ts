import { webcrypto } from 'crypto';

// Set up global crypto BEFORE importing jwt module
global.crypto = webcrypto as Crypto;

// Set JWT_SECRET before importing JWT module to ensure consistent behavior
// This prevents test isolation issues where different tests use different secrets
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-external-otp-tests';
}

// NOW import after setting up global crypto and env var
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
  // Store the original JWT_SECRET value to restore after tests
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    // ALWAYS set JWT_SECRET to a consistent value for these tests
    // This ensures signing and verification use the same secret
    // regardless of what other tests may have set
    process.env.JWT_SECRET = 'consistent-test-secret-for-external-otp';
  });

  afterAll(() => {
    // Restore the original value to prevent test pollution
    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  describe('JWT Token Verification', () => {
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
