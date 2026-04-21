// src/app/api/chat/route.ts
// Server-side proxy — LLM_API_KEY is never exposed to the browser.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const baseUrl = (process.env.LLM_BASE_URL || '').trim();
    const apiKey = (process.env.LLM_API_KEY || '').trim();

    console.log('[LLM Proxy] baseUrl:', baseUrl);
    console.log('[LLM Proxy] apiKey present:', !!apiKey);
    console.log('[LLM Proxy] request body:', JSON.stringify(body));

    if (!baseUrl) {
      console.error('[LLM Proxy] LLM_BASE_URL is not configured');
      return NextResponse.json(
        { error: 'LLM_BASE_URL not configured' },
        { status: 500 }
      );
    }

    if (!apiKey) {
      console.error('[LLM Proxy] LLM_API_KEY is not configured');
      return NextResponse.json(
        { error: 'LLM API key not configured' },
        { status: 500 }
      );
    }

    const targetUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    console.log('[LLM Proxy] forwarding to:', targetUrl);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    console.log('[LLM Proxy] response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LLM Proxy] error response body:', errorText);
      return new NextResponse(errorText, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('[LLM Proxy] success');
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LLM Proxy] caught exception:', msg);
    return NextResponse.json(
      { error: `Proxy Error: ${msg}` },
      { status: 500 }
    );
  }
}