// src/services/enrichment.service.ts

import fs from 'fs';
import path from 'path';
import { Story } from '@/types';
import { LLMService } from './llm.service';
import { StoryRepository } from '@/repositories/story.repository';
import { logger } from '@/lib/logger';

export class EnrichmentService {
  private llmService: LLMService;
  private repository: StoryRepository;
  private promptTemplate: string;

  constructor() {
    this.llmService = new LLMService();
    this.repository = new StoryRepository();
    
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'story_enrichment.txt');
      this.promptTemplate = fs.readFileSync(promptPath, 'utf8');
    } catch (error) {
      logger.error('Failed to load prompt template', error as Error);
      this.promptTemplate = '';
    }
  }

  async enrichStory(story: Story) {
    if (process.env.ENABLE_LLM_ENRICHMENT !== 'true') {
      logger.info('LLM enrichment is disabled');
      return;
    }

    if (!this.promptTemplate) {
      logger.error('Cannot enrich story: prompt template missing');
      return;
    }

    try {
      // 1. Create pending record
      await this.repository.createGeneratedContent({
        storyId: story.id,
        providerName: 'OpenAI-Compatible',
        modelName: process.env.LLM_MODEL_NAME || 'gpt-3.5-turbo',
        status: 'pending',
      });

      // 2. Prepare prompt
      const prompt = this.promptTemplate
        .replace('{{title}}', story.title || 'Untitled')
        .replace('{{tellerBackground}}', story.tellerBackground || 'N/A')
        .replace('{{storyBackground}}', story.storyBackground || 'N/A')
        .replace('{{content}}', story.content);

      // 3. Call LLM
      const generatedText = await this.llmService.generateCompletion(prompt);

      // 4. Update record with success
      await this.repository.updateGeneratedContent(story.id, {
        generatedText,
        status: 'completed',
      });

      logger.info(`Successfully enriched story ${story.id}`);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to enrich story ${story.id}`, err);
      
      // Update record with failure
      try {
        await this.repository.updateGeneratedContent(story.id, {
          status: 'failed',
          errorMessage: err.message,
        });
      } catch (dbError) {
        logger.error('Failed to update failure status in DB', dbError as Error);
      }
    }
  }
}
