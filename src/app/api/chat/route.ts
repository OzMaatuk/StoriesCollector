// src/app/api/chat/route.ts
// Server-side proxy — LLM_API_KEY is never exposed to the browser.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callLLM } from '@/lib/llm-client';
import { rateLimit } from '@/lib/rate-limit';

const MAX_BODY_BYTES = parseInt(process.env.CHAT_PROXY_MAX_BODY_BYTES || '20000', 10);
const MAX_TOKENS = parseInt(process.env.CHAT_PROXY_MAX_TOKENS || '512', 10);
const ALLOWED_MODELS = (process.env.CHAT_PROXY_ALLOWED_MODELS || process.env.LLM_MODEL_NAME || '')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

const chatRequestSchema = z.object({
  model: z.string().min(1).max(100).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().min(1).max(8000),
      })
    )
    .min(1)
    .max(20),
  max_tokens: z.number().int().min(1).max(MAX_TOKENS).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

function rateLimitResponse(resetTime?: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(resetTime),
      },
    }
  );
}

function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_CHAT_PROXY !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  const rateLimitResult = rateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.resetTime);
  }

  try {
    const parsed = chatRequestSchema.parse(await request.json());
    const defaultModel = process.env.LLM_MODEL_NAME?.trim() || 'default';
    const model = parsed.model || defaultModel;

    if (!model) {
      return NextResponse.json({ error: 'Model is not configured' }, { status: 500 });
    }

    if (!ALLOWED_MODELS.includes(model)) {
      return NextResponse.json({ error: 'Model is not allowed' }, { status: 400 });
    }

    const data = await callLLM({
      ...parsed,
      model,
      max_tokens: parsed.max_tokens ?? MAX_TOKENS,
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Chat proxy error:', error);
    return NextResponse.json({ error: 'Chat proxy request failed' }, { status: 502 });
  }
}
