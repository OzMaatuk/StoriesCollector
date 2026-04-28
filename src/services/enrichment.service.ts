// src/services/enrichment.service.ts

import fs from 'fs';
import path from 'path';
import { Story } from '@/types';
import { LLMService } from './llm.service';
import { StoryRepository } from '@/repositories/story.repository';
import { logger } from '@/lib/logger';

type Language = 'en' | 'he' | 'fr';

interface LanguageLabels {
  title: string;
  background: string;
  content: string;
}

const languageLabels: Record<Language, LanguageLabels> = {
  he: {
    title: 'כותרת',
    background: 'רקע הסיפור',
    content: 'תוכן הסיפור',
  },
  en: {
    title: 'Title',
    background: 'Story Background',
    content: 'Story Content',
  },
  fr: {
    title: 'Titre',
    background: 'Contexte de l\'histoire',
    content: 'Contenu de l\'histoire',
  },
};

export class EnrichmentService {
  private llmService: LLMService;
  private repository: StoryRepository;
  private promptTemplates: Map<Language, string> = new Map();

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
        const promptPath = path.join(
          process.cwd(),
          'prompts',
          `story_enrichment_${lang}.txt`
        );
        const template = fs.readFileSync(promptPath, 'utf8');
        this.promptTemplates.set(lang, template);
      } catch (error) {
        logger.warn(`Failed to load prompt template for language ${lang}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private getPromptTemplate(language: string): string {
    const lang = (language.toLowerCase() || 'he') as Language;
    return (
      this.promptTemplates.get(lang) ||
      this.promptTemplates.get('he') ||
      ''
    );
  }

  private buildPrompt(story: Story): string {
    const promptTemplate = this.getPromptTemplate(story.language);
    const labels = languageLabels[
      (story.language.toLowerCase() as Language) || 'he'
    ] || languageLabels.he;

    const parts = [promptTemplate.trim()];

    if (story.title) parts.push(`\n${labels.title}: ${story.title}`);
    if (story.storyBackground)
      parts.push(`${labels.background}: ${story.storyBackground}`);
    parts.push(`\n${labels.content}:\n${story.content}`);

    return parts.join('\n');
  }

  async enrichStory(story: Story) {
    if (process.env.ENABLE_LLM_ENRICHMENT !== 'true') {
      logger.info('LLM enrichment is disabled');
      return;
    }

    const promptTemplate = this.getPromptTemplate(story.language);
    if (!promptTemplate) {
      logger.error(
        `Cannot enrich story: prompt template missing for language ${story.language}`
      );
      return;
    }

    let enrichmentRecord;

    try {
      // Try to find an existing temporary draft (unsaved version) to reuse
      const allRecords = await this.repository.getGeneratedContentsByStoryId(story.id);
      const draft = allRecords.find((record) => record.version == null);

      if (draft) {
        enrichmentRecord = draft;
        await this.repository.updateGeneratedContent(draft.id, {
          status: 'pending',
          errorMessage: null,
        });
      } else {
        enrichmentRecord = await this.repository.createGeneratedContent({
          storyId: story.id,
          providerName: 'OpenAI-Compatible',
          modelName: process.env.LLM_MODEL_NAME || 'dicta-il/DictaLM-3.0-24B-Thinking-W4A16',
          status: 'pending',
          version: null,
        });
      }

      const prompt = this.buildPrompt(story);
      const generatedText = await this.llmService.generateCompletion(prompt);

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
