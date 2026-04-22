// src/lib/llm-client.ts
// Internal LLM client — server only. Never imported by browser code.

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
    throw new Error(`LLM Error ${response.status}: ${errText}`);
  }

  return response.json() as Promise<LLMResponse>;
}