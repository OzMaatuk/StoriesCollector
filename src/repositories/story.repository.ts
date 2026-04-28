import prisma from '@/lib/prisma';
import { Story, StoryCreateInput } from '@/types';
import { Prisma } from '@prisma/client';

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

  async createGeneratedContent(data: {
    storyId: string;
    providerName: string;
    modelName: string;
    status: string;
    version?: number | null;
  }) {
    return await prisma.generatedContent.create({
      data,
    });
  }

  async updateGeneratedContent(
    id: string,
    data: {
      generatedText?: string;
      status?: string;
      errorMessage?: string | null;
      version?: number | null;
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

  async getGeneratedContentById(id: string) {
    return await prisma.generatedContent.findUnique({
      where: { id },
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

    return await prisma.$transaction(async (tx) => {
      const updatedEnrichment = await tx.generatedContent.update({
        where: { id: enrichmentId },
        data: {
          version: nextVersion,
        },
      });

      await tx.story.update({
        where: { id: storyId },
        data: { selectedEnrichmentId: enrichmentId },
      });

      return updatedEnrichment;
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
