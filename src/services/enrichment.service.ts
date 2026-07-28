// src/services/enrichment.service.ts

import fs from 'fs';
import path from 'path';
import { Language, Story } from '@/types';
import { LLMService } from './llm.service';
import { StoryRepository } from '@/repositories/story.repository';
import { logger } from '@/lib/logger';
import { getTranslations } from '@/lib/translations';

interface PromptLabels {
  title: string;
  background: string;
  content: string;
}

export class EnrichmentService {
  private llmService: LLMService;
  private repository: StoryRepository;
  private promptTemplates: Map<Language, string> = new Map();
  private systemPrompts: Map<Language, string> = new Map();

  constructor() {
    this.llmService = new LLMService();
    this.repository = new StoryRepository();

    // Load prompts for each language
    this.loadPromptTemplates();
  }

  private loadPromptTemplates(): void {
    const languages: Language[] = ['he', 'en', 'fr'];

    for (const lang of languages) {
      try {
        const promptPath = path.join(process.cwd(), 'prompts', `story_enrichment_${lang}.txt`);
        const template = fs.readFileSync(promptPath, 'utf8');
        this.promptTemplates.set(lang, template);
      } catch (error) {
        logger.warn(`Failed to load prompt template for language ${lang}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      try {
        const systemPath = path.join(process.cwd(), 'prompts', `story_enrichment_system_${lang}.txt`);
        const systemPrompt = fs.readFileSync(systemPath, 'utf8');
        this.systemPrompts.set(lang, systemPrompt.trim());
      } catch (error) {
        logger.warn(`Failed to load system prompt for language ${lang}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private getPromptTemplate(language: string): string {
    const lang = (language.toLowerCase() || 'he') as Language;
    return this.promptTemplates.get(lang) || this.promptTemplates.get('he') || '';
  }

  private getPromptLabels(language: string): PromptLabels {
    const lang = (language?.toLowerCase() || 'he') as Language;
    const translations = getTranslations(lang);

    return {
      title: translations.form.storyTitle || 'Title',
      background: translations.form.storyBackground || 'Story Background',
      content: translations.form.content || 'Story Content',
    };
  }

  private buildSystemPrompt(language: string): string {
    const lang = (language?.toLowerCase() || 'he') as Language;
    return this.systemPrompts.get(lang) ?? this.systemPrompts.get('he') ?? '';
  }

  private buildUserContent(story: Story): string {
    const template = this.getPromptTemplate(story.language).trim();
    const labels = this.getPromptLabels(story.language);
    const parts: string[] = [template];

    if (story.title) parts.push(`${labels.title}: ${story.title}`);
    if (story.storyBackground) parts.push(`${labels.background}: ${story.storyBackground}`);
    parts.push(`${story.content}`);

    return parts.join(' ');
  }

  /**
   * Ensures a draft GeneratedContent row (version === null) exists for the story and
   * returns it. Creates one if none exists; resets an existing draft to pending if found.
   * This is safe to call synchronously before firing the background LLM job so the
   * client always has a record to track.
   */
  async getOrCreateDraft(story: Story) {
    const allRecords = await this.repository.getGeneratedContentsByStoryId(story.id);
    const existing = allRecords.find((record) => record.version == null);

    if (existing) {
      return await this.repository.updateGeneratedContent(existing.id, {
        status: 'pending',
        errorMessage: null,
        retryCount: (existing.retryCount || 1) + 1,
      });
    }

    return await this.repository.createGeneratedContent({
      storyId: story.id,
      providerName: 'OpenAI-Compatible',
      modelName: process.env.LLM_MODEL_NAME || 'dicta-il/DictaLM-3.0-24B-Thinking-W4A16',
      status: 'pending',
      version: null,
      retryCount: 1,
    });
  }

  /**
   * @param story - the story to enrich
   * @param existingDraft - optional pre-created draft record; when supplied the
   *   function skips the find-or-create step so we don't double-write the row.
   */
  async enrichStory(story: Story, existingDraft?: Awaited<ReturnType<StoryRepository['updateGeneratedContent']>> | Awaited<ReturnType<StoryRepository['createGeneratedContent']>>) {
    if (process.env.ENABLE_LLM_ENRICHMENT !== 'true') {
      logger.info('LLM enrichment is disabled');
      return;
    }

    const promptTemplate = this.getPromptTemplate(story.language);
    if (!promptTemplate) {
      logger.error(`Cannot enrich story: prompt template missing for language ${story.language}`);
      return;
    }

    let enrichmentRecord;

    try {
      // Use the pre-created draft when available (called from POST route) so we
      // don't bump retryCount a second time before the LLM even starts.
      // Fall back to find-or-create when called directly (e.g. at story-create time).
      enrichmentRecord = existingDraft ?? await this.getOrCreateDraft(story);

      const systemPrompt = this.buildSystemPrompt(story.language);
      const userContent = this.buildUserContent(story);
      const generatedText = await this.llmService.generateCompletion(systemPrompt, userContent);

      await this.repository.updateGeneratedContent(enrichmentRecord.id, {
        generatedText,
        status: 'completed',
      });

      logger.info(`Successfully enriched story ${story.id}`);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to enrich story ${story.id}`, err);

      try {
        if (enrichmentRecord?.id) {
          await this.repository.updateGeneratedContent(enrichmentRecord.id, {
            status: 'failed',
            errorMessage: err.message,
          });
        }
      } catch (dbError) {
        logger.error('Failed to update failure status in DB', dbError as Error);
      }
    }
  }
}
