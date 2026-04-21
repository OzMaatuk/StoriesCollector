// src/services/llm.service.ts

import { logger } from '@/lib/logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

export class LLMService {
  private modelName: string;

  constructor() {
    this.modelName =
      process.env.LLM_MODEL_NAME || 'dicta-il/DictaLM-3.0-24B-Thinking-W4A16';
  }

  async generateCompletion(prompt: string): Promise<string> {
    const body = {
      model: this.modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100, // Match working curl and prevent Netlify 10s timeout
    };

    return this.callWithRetry(body);
  }

  private async callWithRetry(
    body: object,
    retryCount = 0
  ): Promise<string> {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${appUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Model still waking up — retry
      if (RETRYABLE_STATUSES.has(response.status)) {
        if (retryCount < MAX_RETRIES) {
          logger.info(`LLM not ready (${response.status}), retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          return this.callWithRetry(body, retryCount + 1);
        }
        throw new Error(`LLM unavailable after ${MAX_RETRIES} retries (status ${response.status})`);
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM Error ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
      };

      return data.choices[0].message.content;
    } catch (error: unknown) {
      // Re-throw retry-aware errors directly
      if (error instanceof Error && error.message.startsWith('LLM')) {
        logger.error('LLM completion failed', error);
        throw error;
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('LLM completion failed', error as Error);
      throw new Error(`LLM Error: ${msg}`);
    }
  }
}