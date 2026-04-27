// No global.crypto assignment needed anymore

process.env.JWT_SECRET = 'test-secret';

import { verifyToken, signToken } from '../../src/lib/jwt';

describe('External OTP Service Integration', () => {
  describe('JWT Token Verification', () => {
    it('should verify valid JWT tokens', async () => {
      const token = await signToken('test@example.com', 'email');
      const result = await verifyToken(token);
      expect(result).toEqual({ recipient: 'test@example.com', channel: 'email' });
    });

    it('should return null for invalid tokens', async () => {
      const result = await verifyToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for tokens with invalid signature', async () => {
      const token = await signToken('test@example.com', 'email');
      const parts = token.split('.');
      // Flip one character in signature — guaranteed mismatch
      const badSig = parts[2][0] === 'a' ? 'b' + parts[2].slice(1) : 'a' + parts[2].slice(1);
      const result = await verifyToken(`${parts[0]}.${parts[1]}.${badSig}`);
      expect(result).toBeNull();
    });

    it('should return null for malformed tokens', async () => {
      const result = await verifyToken('not.a.valid.jwt');
      expect(result).toBeNull();
    });
  });
});