// src/services/llm.service.ts

import { logger } from '@/lib/logger';
import { callLLM } from '@/lib/llm-client';

const MAX_RETRIES = 60; // 60 retries * 5000ms = 5 minutes wait for cold start
const RETRY_DELAY_MS = 5000;
const RETRYABLE_STATUSES = new Set([502, 503, 504, 524]);

export class LLMService {
  private modelName: string;
  private maxTokens: number;

  constructor() {
    const configuredModel = process.env.LLM_MODEL_NAME?.trim();
    this.modelName = configuredModel || 'default';
    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '500', 10);
  }

  async generateCompletion(systemPrompt: string, userContent: string): Promise<string> {
    const body = {
      model: this.modelName,
      stop: ['</think>'],
      max_tokens: this.maxTokens,
      temperature: 0.7,
      top_p: 0.9,
      repeat_penalty: 1.12,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    };

    return this.callWithRetry(body);
  }

  private async callWithRetry(body: object, retryCount = 0): Promise<string> {
    try {
      const data = await callLLM(body);
      return data.choices[0].message.content;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Retry on 502/503/504/524 or timeout error
      const statusMatch = err.message.match(/LLM Error (\d+):/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
      const isTimeout = err.message.toLowerCase().includes('timed out');

      if ((RETRYABLE_STATUSES.has(status) || isTimeout) && retryCount < MAX_RETRIES) {
        logger.info(`LLM not ready (${status || 'timeout'}), retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this.callWithRetry(body, retryCount + 1);
      }

      logger.error('LLM completion failed', err);
      throw new Error(`LLM Error: ${err.message}`);
    }
  }
}
