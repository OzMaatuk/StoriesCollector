import prisma from '@/lib/prisma';
import { Story, StoryCreateInput } from '@/types';
import { Prisma } from '@prisma/client';
import { ConflictError, LimitExceededError } from '@/lib/errors';

const publicStorySelect = {
  id: true,
  name: true,
  city: true,
  country: true,
  tellerBackground: true,
  storyBackground: true,
  title: true,
  content: true,
  language: true,
  verifiedEmail: true,
  selectedEnrichmentId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StorySelect;

const publicGeneratedContentSelect = {
  id: true,
  storyId: true,
  providerName: true,
  modelName: true,
  generatedText: true,
  status: true,
  version: true,
  retryCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GeneratedContentSelect;

export class StoryRepository {
  async create(data: StoryCreateInput): Promise<Story> {
    const story = await prisma.story.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email,
        city: data.city || null,
        country: data.country || null,
        tellerBackground: data.tellerBackground || null,
        storyBackground: data.storyBackground || null,
        title: data.title || null,
        content: data.content,
        language: data.language,
        verifiedEmail: data.verifiedEmail ?? false,
      },
    });
    return story;
  }

  async findById(id: string): Promise<Story | null> {
    try {
      const story = await prisma.story.findUnique({
        where: { id },
        include: {
          generatedContents: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!story) return null;

      // Ensure we return a plain object that can be serialized across the server/client boundary
      return JSON.parse(JSON.stringify(story)) as Story;
    } catch (error) {
      console.error('Error fetching story with enrichments:', error);

      // Fallback: Try to fetch the story without the enrichment relation
      // in case the database table or relation doesn't exist (old data structure)
      try {
        const story = await prisma.story.findUnique({
          where: { id },
        });

        if (!story) return null;

        // Return without generatedContents if we couldn't fetch it
        return JSON.parse(JSON.stringify(story)) as Story;
      } catch (fallbackError) {
        console.error('Fatal error fetching story:', fallbackError);
        return null;
      }
    }
  }

  async findPublicById(id: string) {
    return prisma.story.findUnique({
      where: { id },
      select: {
        ...publicStorySelect,
        generatedContents: {
          orderBy: { createdAt: 'desc' },
          select: publicGeneratedContentSelect,
        },
      },
    });
  }

  async createGeneratedContent(data: {
    storyId: string;
    providerName: string;
    modelName: string;
    status: string;
    version?: number | null;
    retryCount?: number;
  }) {
    return await prisma.generatedContent.create({
      data: {
        ...data,
        retryCount: data.retryCount ?? 1,
      },
    });
  }

  async updateGeneratedContent(
    id: string,
    data: {
      generatedText?: string | null;
      status?: string;
      errorMessage?: string | null;
      version?: number | null;
      retryCount?: number;
    }
  ) {
    return await prisma.generatedContent.update({
      where: { id },
      data,
    });
  }

  async getGeneratedContentsByStoryId(storyId: string) {
    return await prisma.generatedContent.findMany({
      where: { storyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicGeneratedContentsByStoryId(storyId: string) {
    return prisma.generatedContent.findMany({
      where: { storyId },
      orderBy: { createdAt: 'desc' },
      select: publicGeneratedContentSelect,
    });
  }

  async getGeneratedContentById(id: string) {
    return await prisma.generatedContent.findUnique({
      where: { id },
    });
  }

  /**
   * Atomically claim a completed/failed draft for one more generation. Public
   * requests use this instead of relying on the browser to enforce limits.
   */
  async claimDraftForGeneration(storyId: string, maxGenerations: number) {
    return prisma.$transaction(async (tx) => {
      // Serializes generation claims for this story without holding the lock
      // during the long-running LLM request.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${storyId}))`;

      const records = await tx.generatedContent.findMany({
        where: { storyId },
        orderBy: { createdAt: 'desc' },
      });
      const draft = records.find((record) => record.version === null);

      if (draft?.status === 'pending' || draft?.status === 'processing') {
        throw new ConflictError('An enrichment is already being generated for this story');
      }

      const completedVersions = records.filter((record) => record.version !== null).length;
      const generationCount = completedVersions + (draft?.retryCount ?? 0);
      if (generationCount >= maxGenerations) {
        throw new LimitExceededError('This story has reached its enrichment limit');
      }

      if (draft) {
        return tx.generatedContent.update({
          where: { id: draft.id },
          data: {
            status: 'pending',
            generatedText: null,
            errorMessage: null,
            retryCount: draft.retryCount + 1,
          },
        });
      }

      return tx.generatedContent.create({
        data: {
          storyId,
          providerName: process.env.LLM_PROVIDER_NAME || 'default',
          modelName: process.env.LLM_MODEL_NAME || 'default',
          status: 'pending',
          version: null,
          retryCount: 1,
        },
      });
    });
  }

  /**
   * Guarantees a draft row (version === null) exists for the story.
   * If one already exists it is returned as-is — content and status are NOT
   * touched, so a completed draft keeps its text and a pending draft keeps
   * spinning.  Only creates a new row when none is found.
   */
  async ensureDraftExists(storyId: string) {
    const existing = await prisma.generatedContent.findFirst({
      where: { storyId, version: null },
    });

    if (existing) return existing;

    return await prisma.generatedContent.create({
      data: {
        storyId,
        providerName: process.env.LLM_PROVIDER_NAME || 'default',
        modelName: process.env.LLM_MODEL_NAME || 'default',
        generatedText: null,
        status: 'completed',
        version: null,
        retryCount: 0,
      },
    });
  }

  async updateSelectedEnrichment(storyId: string, enrichmentId: string | null) {
    return await prisma.story.update({
      where: { id: storyId },
      data: { selectedEnrichmentId: enrichmentId },
    });
  }

  async saveGeneratedContentVersion(storyId: string, enrichmentId: string) {
    const latestVersionResult = await prisma.generatedContent.findFirst({
      where: {
        storyId,
        version: { not: null },
      },
      orderBy: {
        version: 'desc',
      },
    });

    const nextVersion = (latestVersionResult?.version ?? 0) + 1;

    await prisma.$transaction(async (tx) => {
      await tx.generatedContent.update({
        where: { id: enrichmentId },
        data: { version: nextVersion },
      });

      await tx.story.update({
        where: { id: storyId },
        data: { selectedEnrichmentId: enrichmentId },
      });

      // The saved row is now a versioned record — replace it with a fresh
      // empty draft so the Draft slot is always available for the next generation.
      await tx.generatedContent.create({
        data: {
          storyId,
          providerName: process.env.LLM_PROVIDER_NAME || 'default',
          modelName: process.env.LLM_MODEL_NAME || 'default',
          generatedText: null,
          status: 'completed',
          version: null,
          retryCount: 0,
        },
      });
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    language?: string;
    orderBy?: Prisma.StoryOrderByWithRelationInput;
  }): Promise<Story[]> {
    const { skip = 0, take = 10, language, orderBy = { createdAt: 'desc' } } = params;

    const where: Prisma.StoryWhereInput = language ? { language } : {};

    return await prisma.story.findMany({
      where,
      skip,
      take,
      orderBy,
    });
  }

  async findManyPublic(params: {
    skip?: number;
    take?: number;
    language?: string;
    orderBy?: Prisma.StoryOrderByWithRelationInput;
  }) {
    const { skip = 0, take = 10, language, orderBy = { createdAt: 'desc' } } = params;
    return prisma.story.findMany({
      where: language ? { language } : {},
      skip,
      take,
      orderBy,
      select: publicStorySelect,
    });
  }

  async count(language?: string): Promise<number> {
    const where: Prisma.StoryWhereInput = language ? { language } : {};
    return await prisma.story.count({ where });
  }

  async updateVerificationStatus(id: string, verified: boolean): Promise<Story> {
    return await prisma.story.update({
      where: { id },
      data: { verifiedEmail: verified },
    });
  }
}
