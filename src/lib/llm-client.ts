// src/lib/llm-client.ts

export interface LLMResponse {
  choices: { message: { content: string } }[];
}

export async function callLLM(body: object): Promise<LLMResponse> {
  const baseUrl = (process.env.LLM_BASE_URL || '').trim();
  const apiKey = (process.env.LLM_API_KEY || '').trim();

  if (!baseUrl) {
    throw new Error('LLM_BASE_URL not configured');
  }

  if (!apiKey) {
    throw new Error('LLM_API_KEY not configured');
  }

  const targetUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  // Log exact request details for comparison with working curl
  console.log('[LLM Client] URL:', targetUrl);
  console.log('[LLM Client] Model:', (body as any).model);
  console.log('[LLM Client] Auth header prefix:', `Bearer ${apiKey.slice(0, 8)}...`);
  console.log('[LLM Client] Auth header length:', `Bearer ${apiKey}`.length);
  console.log('[LLM Client] Request body:', JSON.stringify(body));

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[LLM Client] error response:', errText);
    throw new Error(`LLM Error ${response.status}: ${errText}`);
  }

  return response.json() as Promise<LLMResponse>;
}