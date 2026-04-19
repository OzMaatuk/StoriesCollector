// src/services/llm.service.ts

import axios from 'axios';
import { logger } from '@/lib/logger';

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  timeout: number;
}

export class LLMService {
  private config: LLMConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
      apiKey: process.env.LLM_API_KEY || '',
      modelName: process.env.LLM_MODEL_NAME || 'gpt-3.5-turbo',
      timeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
    };
  }

  async generateCompletion(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('LLM API key is not configured');
    }

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        {
          model: this.config.modelName,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: this.config.timeout,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: any) {
      logger.error('LLM completion failed', error);
      throw new Error(`LLM Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}
