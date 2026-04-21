// src/app/api/chat/route.ts
// Server-side proxy — LLM_API_KEY is never exposed to the browser.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
    const apiKey = process.env.LLM_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'LLM API key not configured' }, { status: 500 });
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new NextResponse(errorText, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Proxy Error: ${msg}` }, { status: 500 });
  }
}
