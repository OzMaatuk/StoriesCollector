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
    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        generatedContent: true,
      },
    });
    return story as any; // Cast as any because the Story type in types/index.ts doesn't have generatedContent yet
  }

  async createGeneratedContent(data: {
    storyId: string;
    providerName: string;
    modelName: string;
    status: string;
  }) {
    return await prisma.generatedContent.create({
      data,
    });
  }

  async updateGeneratedContent(
    storyId: string,
    data: {
      generatedText?: string;
      status?: string;
      errorMessage?: string;
    }
  ) {
    return await prisma.generatedContent.update({
      where: { storyId },
      data,
    });
  }

  async getGeneratedContentByStoryId(storyId: string) {
    return await prisma.generatedContent.findUnique({
      where: { storyId },
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
