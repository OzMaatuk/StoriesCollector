// src/services/llm.service.ts

import { logger } from '@/lib/logger';
import { callLLM } from '@/lib/llm-client';

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
      max_tokens: 10000,
    };

    return this.callWithRetry(body);
  }

  private async callWithRetry(
    body: object,
    retryCount = 0
  ): Promise<string> {
    try {
      const data = await callLLM(body);
      return data.choices[0].message.content;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Retry on 502/503/504
      const statusMatch = err.message.match(/LLM Error (\d+):/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

      if (RETRYABLE_STATUSES.has(status) && retryCount < MAX_RETRIES) {
        logger.info(
          `LLM not ready (${status}), retrying (${retryCount + 1}/${MAX_RETRIES})...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this.callWithRetry(body, retryCount + 1);
      }

      logger.error('LLM completion failed', err);
      throw new Error(`LLM Error: ${err.message}`);
    }
  }
}