// src/app/api/chat/route.ts
// Server-side proxy — LLM_API_KEY is never exposed to the browser.

import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await callLLM(body);
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Proxy Error: ${msg}` }, { status: 500 });
  }
}