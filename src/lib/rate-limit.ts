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

export function rateLimit(request: NextRequest): { success: boolean; remaining?: number; resetTime?: number } {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();

  // Clean up old entries
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });

  if (!store[ip]) {
    store[ip] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    return { success: true, remaining: MAX_REQUESTS - 1, resetTime: store[ip].resetTime };
  }

  if (store[ip].resetTime < now) {
    store[ip] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    return { success: true, remaining: MAX_REQUESTS - 1, resetTime: store[ip].resetTime };
  }

  if (store[ip].count >= MAX_REQUESTS) {
    return { success: false, remaining: 0, resetTime: store[ip].resetTime };
  }

  store[ip].count += 1;
  return { success: true, remaining: MAX_REQUESTS - store[ip].count, resetTime: store[ip].resetTime };
}