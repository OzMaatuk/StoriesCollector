// src/lib/llm-client.ts

export interface LLMResponse {
  choices: { message: { content: string } }[];
}

export async function callLLM(body: object): Promise<LLMResponse> {
  const baseUrl = (process.env.LLM_BASE_URL || '').trim();
  const apiKey = (process.env.LLM_API_KEY || '').trim();
  const debugLogsEnabled = process.env.LLM_DEBUG_LOGS === 'true';

  if (!baseUrl) {
    throw new Error('LLM_BASE_URL not configured');
  }

  if (!apiKey) {
    throw new Error('LLM_API_KEY not configured');
  }

  const targetUrl = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  if (debugLogsEnabled) {
    const bodyModel = (body as Record<string, unknown>).model;
    console.warn('[LLM Client] URL:', targetUrl);
    console.warn('[LLM Client] Model:', bodyModel);
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (debugLogsEnabled) {
      console.error('[LLM Client] error response length:', errText.length);
    }
    throw new Error(`LLM Error ${response.status}: upstream request failed`);
  }

  return response.json() as Promise<LLMResponse>;
}
