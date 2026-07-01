import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10);
const TRUST_PROXY_HEADERS = process.env.RATE_LIMIT_TRUST_PROXY_HEADERS === 'true';

function getClientKey(request: NextRequest): string {
  if (TRUST_PROXY_HEADERS) {
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const realIp = request.headers.get('x-real-ip')?.trim();
    if (forwardedFor) return forwardedFor;
    if (realIp) return realIp;
  }

  return 'default';
}

export function rateLimit(request: NextRequest): { success: boolean; remaining?: number; resetTime?: number } {
  const key = getClientKey(request);
  const now = Date.now();

  // Clean up old entries
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });

  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    return { success: true, remaining: MAX_REQUESTS - 1, resetTime: store[key].resetTime };
  }

  if (store[key].resetTime < now) {
    store[key] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    return { success: true, remaining: MAX_REQUESTS - 1, resetTime: store[key].resetTime };
  }

  if (store[key].count >= MAX_REQUESTS) {
    return { success: false, remaining: 0, resetTime: store[key].resetTime };
  }

  store[key].count += 1;
  return { success: true, remaining: MAX_REQUESTS - store[key].count, resetTime: store[key].resetTime };
}
