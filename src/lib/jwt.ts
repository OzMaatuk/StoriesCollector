import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function verifyToken(token: string): { recipient: string; channel: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown & {
      recipient: string;
      channel: string;
      verified: boolean;
    };
    return {
      recipient: decoded.recipient,
      channel: decoded.channel,
    };
  } catch {
    return null;
  }
}