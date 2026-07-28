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
        const systemPath = path.join(
          process.cwd(),
          'prompts',
          `story_enrichment_system_${lang}.txt`
        );
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

  async getOrCreateDraft(story: Story) {
    const allRecords = await this.repository.getGeneratedContentsByStoryId(story.id);
    const existing = allRecords.find((record) => record.version == null);

    if (existing) {
      return await this.repository.updateGeneratedContent(existing.id, {
        status: 'pending',
        generatedText: null,
        errorMessage: null,
        retryCount: (existing.retryCount || 0) + 1,
      });
    }

    return await this.repository.createGeneratedContent({
      storyId: story.id,
      providerName: 'llama-cpp-local',
      modelName: process.env.LLM_MODEL_NAME || 'llama-3-8b-instruct',
      status: 'pending',
      version: null,
      retryCount: 1,
    });
  }

  private async triggerAsyncPythonEnrichment(
    story: Story,
    draftRecord: Awaited<ReturnType<StoryRepository['createGeneratedContent']>>
  ) {
    const pythonUrl = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const systemPrompt = this.buildSystemPrompt(story.language);
    const userContent = this.buildUserContent(story);
    const prompt = systemPrompt ? `${systemPrompt}\n\n${userContent}` : userContent;

    const payload = {
      enrichmentId: draftRecord.id,
      storyId: story.id,
      providerName: draftRecord.providerName || 'llama-cpp-local',
      modelName: draftRecord.modelName || process.env.LLM_MODEL_NAME || 'llama-3-8b-instruct',
      prompt,
      version: draftRecord.version,
      retryCount: draftRecord.retryCount,
    };

    const response = await fetch(`${pythonUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Python backend returned ${response.status}`);
    }

    logger.info(`Delegated enrichment to Python backend for story ${story.id}`);
  }

  async enrichStory(
    story: Story,
    existingDraft?:
      | Awaited<ReturnType<StoryRepository['updateGeneratedContent']>>
      | Awaited<ReturnType<StoryRepository['createGeneratedContent']>>
  ) {
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
      enrichmentRecord = existingDraft ?? (await this.getOrCreateDraft(story));

      const executionMethod = process.env.LLM_EXECUTION_METHOD || 'async_python';

      if (executionMethod === 'async_python') {
        await this.triggerAsyncPythonEnrichment(story, enrichmentRecord);
        return;
      }

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
