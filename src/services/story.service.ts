// src/services/story.service.ts

import { StoryRepository } from '@/repositories/story.repository';
import { Story, PaginatedResponse } from '@/types';
import { sanitizeStoryInput } from '@/lib/sanitization';
import { storySchema } from '@/lib/validation';
import { ZodError } from 'zod';
import { verifyToken } from '@/lib/jwt';

type CreateStoryInput = Record<string, string | undefined>;

export class StoryService {
  private repository: StoryRepository;

  constructor() {
    this.repository = new StoryRepository();
  }

  async createStory(input: CreateStoryInput): Promise<Story> {
    const sanitized = sanitizeStoryInput(input);

    // Validate
    try {
      const validated = storySchema.parse(sanitized);

      // Verify OTP token if provided
      if (validated.verificationToken) {
        const tokenData = await verifyToken(validated.verificationToken);
        if (!tokenData) {
          throw new Error('Invalid or expired verification token');
        }

        // Ensure the verified contact matches the provided contact
        const hasMatchingEmail = validated.email && validated.email === tokenData.recipient;
        const hasMatchingPhone = validated.phone && validated.phone === tokenData.recipient;

        if (!hasMatchingEmail && !hasMatchingPhone) {
          throw new Error('Verification token does not match provided contact information');
        }

        // Build payload without verificationToken
        const { verificationToken: _omit, ...validatedWithoutToken } = validated;
        void _omit;
        const storyData = {
          ...validatedWithoutToken,
          verifiedPhone: tokenData.channel === 'sms',
          phone: validated.phone ?? '',
          email: validated.email ?? '',
        };

        return await this.repository.create(storyData);
      } else {
        // For backward compatibility, allow stories without verification for now
        // In production, you might want to require verification
        return await this.repository.create({
          ...validated,
          phone: validated.phone ?? '',
          email: validated.email ?? '',
        });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        throw new Error(JSON.stringify(error.flatten().fieldErrors));
      }
      throw error;
    }
  }

  async getStoryById(id: string): Promise<Story | null> {
    return await this.repository.findById(id);
  }

  async getStories(params: {
    page?: number;
    pageSize?: number;
    language?: string;
  }): Promise<PaginatedResponse<Story>> {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 10, 100); // Max 100 per page
    const skip = (page - 1) * pageSize;

    const [stories, totalCount] = await Promise.all([
      this.repository.findMany({
        skip,
        take: pageSize,
        language: params.language,
      }),
      this.repository.count(params.language),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: stories,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  async verifyStoryPhone(id: string): Promise<Story> {
    return await this.repository.updateVerificationStatus(id, true);
  }
}
