// src/lib/llm-client.ts

import { Agent } from 'undici';

export interface LLMResponse {
  choices: { message: { content: string } }[];
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getLLMRequestTimeoutMs(): number {
  const raw = process.env.LLM_REQUEST_TIMEOUT_MS?.trim();
  if (!raw) {
    return ONE_DAY_MS;
  }

  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return ONE_DAY_MS;
  }

  return parsed;
}

let cachedDispatcher: Agent | null = null;
let cachedDispatcherTimeoutMs: number | null = null;

function getLLMDispatcher(timeoutMs: number): Agent {
  if (cachedDispatcher && cachedDispatcherTimeoutMs === timeoutMs) {
    return cachedDispatcher;
  }

  cachedDispatcher = new Agent({
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
    connectTimeout: 60_000,
  });
  cachedDispatcherTimeoutMs = timeoutMs;
  return cachedDispatcher;
}

export async function callLLM(body: object): Promise<LLMResponse> {
  const baseUrl = (process.env.LLM_BASE_URL || '').trim();
  const apiKey = (process.env.LLM_API_KEY || '').trim();
  const debugLogsEnabled = process.env.LLM_DEBUG_LOGS === 'true';
  const timeoutMs = getLLMRequestTimeoutMs();

  if (!baseUrl) {
    throw new Error('LLM_BASE_URL not configured');
  }

  if (!apiKey) {
    throw new Error('LLM_API_KEY not configured');
  }

  const targetUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  if (debugLogsEnabled) {
    const bodyModel = (body as Record<string, unknown>).model;
    console.warn('[LLM Client] URL:', targetUrl);
    console.warn('[LLM Client] Model:', bodyModel);
    console.warn('[LLM Client] Request timeout (ms):', timeoutMs);
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      dispatcher: getLLMDispatcher(timeoutMs),
    } as RequestInit & { dispatcher?: Agent });

    if (!response.ok) {
      const errText = await response.text();
      if (debugLogsEnabled) {
        console.error('[LLM Client] error response length:', errText.length);
      }
      throw new Error(`LLM Error ${response.status}: upstream request failed`);
    }

    return response.json() as Promise<LLMResponse>;
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error(`LLM Error: request timed out after ${timeoutMs}ms`);
    }

    throw error;
  }
}
